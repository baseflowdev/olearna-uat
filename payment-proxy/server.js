require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { Redis } = require("@upstash/redis");

const app = express();
app.use(express.json());

// Allow requests from your Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://olearna-uat.vercel.app",
  methods: ["GET", "POST"],
}));

// ── Redis (same Upstash instance as your Vercel app) ──────────────────────
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const STORAGE_KEY = "olearna_transactions";

async function readTransactions() {
  const data = await redis.get(STORAGE_KEY);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

async function saveTransactions(transactions) {
  await redis.set(STORAGE_KEY, JSON.stringify(transactions));
}

// ── Health check ──────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Olearna Payment Proxy" });
});

// ── POST /pay — Proxy to Hubtel Direct Receive Money ─────────────────────
app.post("/pay", async (req, res) => {
  const { user_id, amount, plan, phone, channel } = req.body;

  if (!amount || !plan || !phone || !channel) {
    return res.status(400).json({ error: "Missing required fields: amount, plan, phone, channel" });
  }

  // Normalize phone to 233XXXXXXXXX
  let msisdn = phone.replace(/[\s\-\+]/g, "");
  if (msisdn.startsWith("0") && msisdn.length === 10) {
    msisdn = "233" + msisdn.slice(1);
  }

  const reference = "OLN" + Date.now();

  // Save as PENDING
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

  console.log(`[PAY] Initiated — Ref: ${reference}, Phone: ${msisdn}, Amount: GHS ${amount}`);

  // Call Hubtel
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

  try {
    const hubtelRes = await axios.post(
      hubtelUrl,
      hubtelPayload,
      {
        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    console.log(`[PAY] Hubtel accepted — Ref: ${reference}`, hubtelRes.data);

    // Store outgoing request details for frontend logs
    const txs = await readTransactions();
    const idx = txs.findIndex((t) => t.reference === reference);
    if (idx !== -1) {
      txs[idx].request_log = {
        url: hubtelUrl,
        callback_url: callbackUrl,
        payload: hubtelPayload,
        hubtel_response: hubtelRes.data,
        sent_at: new Date().toISOString(),
      };
      await saveTransactions(txs);
    }

    return res.json({
      message: "Payment prompt sent to customer's phone.",
      reference,
      status: "PENDING",
      plan,
      amount,
      phone: msisdn,
      hubtel: hubtelRes.data,
      request_log: {
        url: hubtelUrl,
        callback_url: callbackUrl,
        payload: hubtelPayload,
        hubtel_response: hubtelRes.data,
        sent_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    const status = error.response?.status;
    const errDetails = error.response?.data || error.message;
    console.error("[PAY] Hubtel error:", status, errDetails);

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

    return res.status(502).json({ error: userError, details: errDetails, reference, tip });
  }
});

// ── POST /callback — Receives Hubtel payment result ──────────────────────
app.post("/callback", async (req, res) => {
  const body = req.body;
  console.log("[CALLBACK] Received:", JSON.stringify(body, null, 2));

  const responseCode = body?.ResponseCode;
  const data = body?.Data || {};
  const clientReference = data?.ClientReference || body?.ClientReference;
  const transactionId = data?.TransactionId;

  if (!clientReference) {
    return res.status(400).json({ error: "Missing ClientReference" });
  }

  const isSuccess = responseCode === "0000";
  const finalStatus = isSuccess ? "SUCCESS" : "FAILED";

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
  console.log(`[CALLBACK] ${clientReference} → ${finalStatus}`);

  res.json({ message: "Callback received", reference: clientReference, status: finalStatus });
});

// ── GET /status/:reference — Check payment status ────────────────────────
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
    request_log: tx.request_log || null,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Payment proxy running on port ${PORT}`);
});
