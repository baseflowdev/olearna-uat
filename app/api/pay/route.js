// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/pay
//
//  Called when a user clicks Subscribe or Upgrade on the frontend.
//  This sends a payment request to Hubtel, which then sends a prompt
//  to the customer's mobile money phone.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import axios from "axios";
import { readTransactions, saveTransactions } from "@/lib/storage";

export async function POST(request) {
  const body = await request.json();
  const { user_id, amount, plan, phone, channel } = body;

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!user_id || !amount || !plan || !phone || !channel) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, amount, plan, phone, channel" },
      { status: 400 }
    );
  }

  // ── Generate a unique reference for this payment ───────────────────────────
  const reference = "OLN-" + Date.now();

  // ── Save the transaction as PENDING right away ─────────────────────────────
  const newTransaction = {
    reference,
    user_id,
    amount,
    plan,
    phone,
    channel,
    status: "PENDING",
    transaction_id: null,
    timestamp: new Date().toISOString(),
  };

  const transactions = await readTransactions();
  transactions.push(newTransaction);
  await saveTransactions(transactions);

  console.log(`[PAY] Initiated — Ref: ${reference}, Phone: ${phone}, Amount: GHS ${amount}`);

  // ── Call Hubtel API to send prompt to customer's phone ─────────────────────
  // Build the Basic Auth token from your Client ID and Secret
  const credentials = `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`;
  const authToken   = Buffer.from(credentials).toString("base64");

  try {
    const hubtelRes = await axios.post(
      `https://api.hubtel.com/v1/merchantaccount/merchants/${process.env.HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`,
      {
        CustomerMsisdn:      phone,
        Channel:             channel,           // e.g. "mtn-gh"
        Amount:              amount,
        PrimaryCallbackUrl:  process.env.CALLBACK_URL,
        Description:         `Olearna ${plan} plan`,
        ClientReference:     reference,
      },
      {
        headers: {
          Authorization:  `Basic ${authToken}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    console.log(`[PAY] Hubtel accepted — Ref: ${reference}`, hubtelRes.data);

    return NextResponse.json({
      message:   "Payment request sent. Customer will receive a prompt on their phone.",
      reference,
      status:    "PENDING",
      plan,
      amount,
      phone,
    });

  } catch (error) {
    const errDetails = error.response?.data || error.message;
    console.error("[PAY] Hubtel API error:", errDetails);

    return NextResponse.json(
      {
        error:     "Hubtel API call failed. Check your API keys.",
        details:   errDetails,
        reference,
        tip:       "Make sure HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_MERCHANT_ACCOUNT are set correctly.",
      },
      { status: 502 }
    );
  }
}
