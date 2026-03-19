// Load environment variables from .env file FIRST — before anything else
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const axios   = require("axios");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "transactions.json");

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readTransactions() {
  const data = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(data);
}

function saveTransactions(transactions) {
  fs.writeFileSync(DB_FILE, JSON.stringify(transactions, null, 2));
}

function generateReference() {
  return "OLN-" + Date.now();
}

// Build the Hubtel Basic Auth token from your Client ID and Secret
function getHubtelAuthToken() {
  const credentials = `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`;
  return Buffer.from(credentials).toString("base64");
}

// ─── ENDPOINT 1: Initiate Payment ─────────────────────────────────────────────
// The frontend calls this when a user clicks Subscribe or Upgrade.
// Body: { user_id, amount, plan, phone }
app.post("/pay", async (req, res) => {
  const { user_id, amount, plan, phone } = req.body;

  if (!user_id || !amount || !plan || !phone) {
    return res.status(400).json({
      error: "Missing required fields: user_id, amount, plan, phone",
    });
  }

  const reference = generateReference();

  // Save a PENDING transaction right away before calling Hubtel
  const newTransaction = {
    reference,
    user_id,
    amount,
    plan,
    phone,
    status: "PENDING",
    transaction_id: null,
    hubtel_response: null,
    timestamp: new Date().toISOString(),
  };

  const transactions = readTransactions();
  transactions.push(newTransaction);
  saveTransactions(transactions);

  console.log(`[PAY] Sending payment request to Hubtel — Ref: ${reference}, Phone: ${phone}, Amount: GHS ${amount}`);

  // ── Call Hubtel's API to send a payment prompt to the customer's phone ──────
  try {
    const hubtelResponse = await axios.post(
      // Replace YOUR_MERCHANT_ACCOUNT with the variable from .env
      `https://api.hubtel.com/v1/merchantaccount/merchants/${process.env.HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`,

      // This is the payment data Hubtel needs
      {
        CustomerMsisdn: phone,            // Customer's phone number (e.g. 0241234567)
        Channel:        "mtn-gh",         // Mobile network: mtn-gh, vodafone-gh, tigo-gh, airtel-gh
        Amount:         amount,
        PrimaryCallbackUrl: process.env.CALLBACK_URL,  // Where Hubtel sends the result
        Description:    `Olearna ${plan} plan payment`,
        ClientReference: reference,
      },

      // Auth header — Hubtel uses Basic Auth (Client ID + Secret)
      {
        headers: {
          Authorization: `Basic ${getHubtelAuthToken()}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    console.log(`[PAY] Hubtel accepted the request. Response:`, hubtelResponse.data);

    // Update the transaction with Hubtel's response code
    const allTransactions = readTransactions();
    const index = allTransactions.findIndex((t) => t.reference === reference);
    allTransactions[index].hubtel_response = hubtelResponse.data;
    saveTransactions(allTransactions);

    return res.status(200).json({
      message: "Payment request sent to Hubtel. Customer will receive a prompt on their phone.",
      reference,
      user_id,
      amount,
      plan,
      phone,
      status: "PENDING",
      hubtel_response_code: hubtelResponse.data?.ResponseCode,
    });

  } catch (error) {
    // If Hubtel returned an error, log it and tell the frontend
    console.error("[PAY] Hubtel API error:", error.response?.data || error.message);

    return res.status(502).json({
      error: "Hubtel API call failed",
      details: error.response?.data || error.message,
      reference,
      tip: "Check your HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_MERCHANT_ACCOUNT in your .env file",
    });
  }
});


// ─── ENDPOINT 2: Hubtel Callback ──────────────────────────────────────────────
// Hubtel calls THIS automatically after the customer approves/rejects on their phone.
// You do NOT need to call this manually — Hubtel posts to your CALLBACK_URL.
// But for testing locally, you can still call it manually with Postman/curl.
app.post("/callback", (req, res) => {
  console.log("[CALLBACK] Received from Hubtel:", JSON.stringify(req.body, null, 2));

  // Hubtel sends the result inside a "Data" object
  // Handle both formats — direct and nested (Hubtel's format can vary slightly)
  const data            = req.body?.Data || req.body;
  const responseCode    = req.body?.ResponseCode || req.body?.Status;
  const clientReference = data?.ClientReference   || req.body?.ClientReference;
  const transactionId   = data?.TransactionId     || req.body?.TransactionId;
  const amount          = data?.Amount             || req.body?.Amount;

  if (!clientReference) {
    console.error("[CALLBACK] Missing ClientReference in callback body");
    return res.status(400).json({ error: "Missing ClientReference" });
  }

  // "0000" is Hubtel's success code. "Success" is also accepted.
  const isSuccess =
    responseCode === "0000" ||
    String(responseCode).toUpperCase() === "SUCCESS" ||
    String(req.body?.Status).toUpperCase() === "SUCCESS";

  const normalizedStatus = isSuccess ? "SUCCESS" : "FAILED";

  const transactions = readTransactions();
  const index = transactions.findIndex((t) => t.reference === clientReference);

  if (index === -1) {
    console.error(`[CALLBACK] No transaction found for reference: ${clientReference}`);
    return res.status(404).json({ error: `No transaction with reference: ${clientReference}` });
  }

  // Update the transaction record
  transactions[index].status              = normalizedStatus;
  transactions[index].transaction_id      = transactionId || null;
  transactions[index].subscription_active = isSuccess;
  transactions[index].callback_received_at = new Date().toISOString();
  transactions[index].raw_callback        = req.body; // Save full callback for audit

  saveTransactions(transactions);

  console.log(`[CALLBACK] Updated Ref: ${clientReference} → ${normalizedStatus}`);

  // Always respond 200 to Hubtel — this tells them you received the callback
  return res.status(200).json({
    message: "Callback received and processed",
    reference: clientReference,
    status: normalizedStatus,
    transaction_id: transactionId,
    subscription_active: isSuccess,
  });
});


// ─── ENDPOINT 3: Check Status ──────────────────────────────────────────────────
app.get("/status/:reference", (req, res) => {
  const { reference } = req.params;
  const transactions  = readTransactions();
  const transaction   = transactions.find((t) => t.reference === reference);

  if (!transaction) {
    return res.status(404).json({ error: `No transaction found: ${reference}` });
  }

  console.log(`[STATUS] ${reference} → ${transaction.status}`);

  return res.status(200).json({
    reference:           transaction.reference,
    user_id:             transaction.user_id,
    plan:                transaction.plan,
    amount:              transaction.amount,
    status:              transaction.status,
    transaction_id:      transaction.transaction_id,
    subscription_active: transaction.subscription_active || false,
    timestamp:           transaction.timestamp,
  });
});


// ─── ENDPOINT 4: View All Transactions ────────────────────────────────────────
app.get("/transactions", (req, res) => {
  const transactions = readTransactions();
  return res.status(200).json({ total: transactions.length, transactions });
});


// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  Olearna UAT Server is RUNNING on port ${PORT}`);
  console.log(`  Frontend: http://localhost:${PORT}/index.html`);
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  Hubtel Merchant Account : ${process.env.HUBTEL_MERCHANT_ACCOUNT || "NOT SET"}`);
  console.log(`  Callback URL            : ${process.env.CALLBACK_URL || "NOT SET"}`);
  console.log("─────────────────────────────────────────────────────────────");
});
