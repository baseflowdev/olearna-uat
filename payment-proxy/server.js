require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Redis } = require("@upstash/redis");

const app = express();
app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://olearna-uat.vercel.app",
  methods: ["GET", "POST"],
}));

// ── Redis ────────────────────────────────────────────────────────────────────
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TX_KEY = "olearna_transactions";
const LOG_PREFIX = "olearna_log:";

async function readTransactions() {
  const data = await redis.get(TX_KEY);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

async function saveTransactions(transactions) {
  await redis.set(TX_KEY, JSON.stringify(transactions));
}

// ── Structured Log Helpers ───────────────────────────────────────────────────

function maskAuth(headers) {
  const masked = { ...headers };
  if (masked.Authorization) {
    masked.Authorization = masked.Authorization.slice(0, 10) + "****";
  }
  return masked;
}

function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\+]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "233" + cleaned.slice(1);
  }
  return cleaned;
}

function buildLogEntry(step, reference, data) {
  return {
    step,
    reference,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

// Save a log step to Redis under its own key (olearna_log:<reference>)
async function saveLog(reference, step, data) {
  const key = LOG_PREFIX + reference;
  const existing = await redis.get(key);
  const log = existing
    ? (typeof existing === "string" ? JSON.parse(existing) : existing)
    : { reference, created_at: new Date().toISOString(), steps: {} };

  log.steps[step] = buildLogEntry(step, reference, data);
  log.updated_at = new Date().toISOString();

  await redis.set(key, JSON.stringify(log));
  return log;
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Olearna Payment Proxy" });
});

// ── POST /pay ────────────────────────────────────────────────────────────────
app.post("/pay", async (req, res) => {
  const { user_id, amount, plan, phone, channel } = req.body;

  if (!amount || !plan || !phone || !channel) {
    return res.status(400).json({ error: "Missing required fields: amount, plan, phone, channel" });
  }

  const msisdn = normalizePhone(phone);
  const reference = "OLN" + Date.now();

  // ── step1: frontend → proxy ──────────────────────────────────────────────
  await saveLog(reference, "step1_frontend_to_proxy", {
    source: "frontend",
    destination: "payment-proxy",
    method: "POST",
    path: "/pay",
    body: { user_id, amount, plan, phone: msisdn, channel },
  });

  // Save transaction as PENDING
  const transactions = await readTransactions();
  transactions.push({
    reference,
    user_id: user_id || msisdn,
    amount,
    plan,
    phone: msisdn,
    channel,
    status: "PENDING",
    transaction_id: null,
    timestamp: new Date().toISOString(),
  });
  await saveTransactions(transactions);

  // Build Hubtel request
  const credentials = `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`;
  const authToken = Buffer.from(credentials).toString("base64");
  const hubtelUrl = `https://rmp.hubtel.com/merchantaccount/merchants/${process.env.HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`;
  const callbackUrl = `${process.env.PROXY_URL}/callback`;
  const hubtelPayload = {
    CustomerMsisdn: msisdn,
    Channel: channel,
    Amount: parseFloat(amount),
    PrimaryCallbackUrl: callbackUrl,
    Description: `Payment for Olearna ${plan} subscription`,
    ClientReference: reference,
  };
  const hubtelHeaders = {
    Authorization: `Basic ${authToken}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  };

  // ── step2: proxy → hubtel (BEFORE sending) ──────────────────────────────
  await saveLog(reference, "step2_proxy_to_hubtel", {
    source: "payment-proxy",
    destination: "rmp.hubtel.com",
    method: "POST",
    url: hubtelUrl,
    headers: maskAuth(hubtelHeaders),
    body: hubtelPayload,
    callback_url: callbackUrl,
  });

  try {
    const hubtelRes = await axios.post(hubtelUrl, hubtelPayload, { headers: hubtelHeaders });

    // ── step3: hubtel initial response ────────────────────────────────────
    await saveLog(reference, "step3_hubtel_initial_response", {
      source: "rmp.hubtel.com",
      destination: "payment-proxy",
      http_status: hubtelRes.status,
      response_code: hubtelRes.data?.ResponseCode,
      message: hubtelRes.data?.Message,
      data: hubtelRes.data?.Data || hubtelRes.data,
    });

    // Update transaction with request log
    const txs = await readTransactions();
    const idx = txs.findIndex((t) => t.reference === reference);
    if (idx !== -1) {
      txs[idx].transaction_id = hubtelRes.data?.Data?.TransactionId || null;
      txs[idx].hubtel_response = hubtelRes.data;
      await saveTransactions(txs);
    }

    const responsePayload = {
      message: "Payment prompt sent to customer's phone.",
      reference,
      status: "PENDING",
      plan,
      amount,
      phone: msisdn,
      hubtel: hubtelRes.data,
    };

    // ── step4: proxy → frontend (response) ────────────────────────────────
    await saveLog(reference, "step4_proxy_to_frontend", {
      source: "payment-proxy",
      destination: "frontend",
      http_status: 200,
      body: responsePayload,
    });

    return res.json(responsePayload);

  } catch (error) {
    const status = error.response?.status;
    const errDetails = error.response?.data || error.message;

    // Log the failed hubtel response as step3
    await saveLog(reference, "step3_hubtel_initial_response", {
      source: "rmp.hubtel.com",
      destination: "payment-proxy",
      http_status: status || "NETWORK_ERROR",
      error: true,
      response_code: errDetails?.ResponseCode || null,
      message: errDetails?.Message || error.message,
      data: errDetails,
    });

    let userError, tip;
    if (status === 401) {
      userError = "Hubtel authentication failed.";
      tip = "Check HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_MERCHANT_ACCOUNT.";
    } else if (status === 403) {
      userError = "Access denied. IP not whitelisted.";
      tip = "Whitelist this server's static IP with your Hubtel Retail Systems Engineer.";
    } else if (status >= 500 || !status) {
      userError = "Hubtel's server is unavailable. Try again later.";
      tip = "Hubtel-side issue.";
    } else {
      userError = `Hubtel error (${errDetails?.ResponseCode || status}).`;
      tip = errDetails?.Message || "Check details.";
    }

    const errorPayload = { error: userError, details: errDetails, reference, tip };

    await saveLog(reference, "step4_proxy_to_frontend", {
      source: "payment-proxy",
      destination: "frontend",
      http_status: 502,
      error: true,
      body: errorPayload,
    });

    return res.status(502).json(errorPayload);
  }
});

// ── POST /callback ───────────────────────────────────────────────────────────
app.post("/callback", async (req, res) => {
  const body = req.body;
  const responseCode = body?.ResponseCode;
  const data = body?.Data || {};
  const clientReference = data?.ClientReference || body?.ClientReference;
  const transactionId = data?.TransactionId;

  if (!clientReference) {
    return res.status(400).json({ error: "Missing ClientReference" });
  }

  const isSuccess = responseCode === "0000";
  const finalStatus = isSuccess ? "SUCCESS" : "FAILED";

  // ── step5: hubtel callback ──────────────────────────────────────────────
  await saveLog(clientReference, "step5_hubtel_callback", {
    source: "rmp.hubtel.com",
    destination: "payment-proxy",
    method: "POST",
    path: "/callback",
    response_code: responseCode,
    message: body?.Message,
    data: data,
    raw: body,
  });

  // Update transaction
  const transactions = await readTransactions();
  const index = transactions.findIndex((t) => t.reference === clientReference);

  if (index === -1) {
    return res.status(404).json({ error: `No transaction: ${clientReference}` });
  }

  transactions[index].status = finalStatus;
  transactions[index].transaction_id = transactionId || null;
  transactions[index].subscription_active = isSuccess;
  transactions[index].callback_received_at = new Date().toISOString();
  transactions[index].raw_callback = body;

  await saveTransactions(transactions);

  // ── final_status ────────────────────────────────────────────────────────
  await saveLog(clientReference, "final_status", {
    status: finalStatus,
    transaction_id: transactionId || null,
    subscription_active: isSuccess,
    amount: data?.Amount,
    charges: data?.Charges,
    amount_after_charges: data?.AmountAfterCharges,
    external_transaction_id: data?.ExternalTransactionId || null,
    payment_date: data?.PaymentDate || null,
    description: data?.Description || null,
  });

  res.json({ message: "Callback received", reference: clientReference, status: finalStatus });
});

// ── GET /status/:reference ───────────────────────────────────────────────────
app.get("/status/:reference", async (req, res) => {
  const { reference } = req.params;
  const transactions = await readTransactions();
  const tx = transactions.find((t) => t.reference === reference);

  if (!tx) {
    return res.status(404).json({ error: `No transaction: ${reference}` });
  }

  res.json({
    reference: tx.reference,
    user_id: tx.user_id,
    plan: tx.plan,
    amount: tx.amount,
    status: tx.status,
    transaction_id: tx.transaction_id,
    subscription_active: tx.subscription_active || false,
    timestamp: tx.timestamp,
    callback_received_at: tx.callback_received_at || null,
    raw_callback: tx.raw_callback || null,
  });
});

// ── GET /logs/:reference — Full structured log for a transaction ─────────────
app.get("/logs/:reference", async (req, res) => {
  const { reference } = req.params;
  const key = LOG_PREFIX + reference;
  const log = await redis.get(key);

  if (!log) {
    return res.status(404).json({ error: `No logs for: ${reference}` });
  }

  const parsed = typeof log === "string" ? JSON.parse(log) : log;
  res.json(parsed);
});

// ── GET /logs — List all transaction logs ────────────────────────────────────
app.get("/logs", async (req, res) => {
  const transactions = await readTransactions();
  const summaries = transactions.slice(-50).reverse().map((tx) => ({
    reference: tx.reference,
    status: tx.status,
    amount: tx.amount,
    plan: tx.plan,
    phone: tx.phone,
    timestamp: tx.timestamp,
    log_url: `/logs/${tx.reference}`,
  }));
  res.json(summaries);
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Payment proxy running on port ${PORT}`);
});
