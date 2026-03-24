// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/pay
//
//  Called when a user clicks Subscribe or Upgrade on the frontend.
//  Uses Hubtel Direct Receive Money API (rmp.hubtel.com) to send a
//  mobile money prompt directly to the customer's phone.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import axios from "axios";
import { readTransactions, saveTransactions, getUser } from "@/lib/storage";

export async function POST(request) {
  const body = await request.json();
  const { user_id, amount, plan, phone, channel } = body;

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!amount || !plan || !phone || !channel) {
    return NextResponse.json(
      { error: "Missing required fields: amount, plan, phone, channel" },
      { status: 400 }
    );
  }

  // ── Normalize phone to international format (233XXXXXXXXX) ─────────────
  let msisdn = phone.replace(/[\s\-\+]/g, "");
  if (msisdn.startsWith("0") && msisdn.length === 10) {
    msisdn = "233" + msisdn.slice(1);
  }

  // ── Generate a unique alphanumeric reference (max 36 chars) ──────────────
  const reference = "OLN" + Date.now();

  // ── Save the transaction as PENDING right away ─────────────────────────────
  const newTransaction = {
    reference,
    user_id: user_id || msisdn,
    amount,
    plan,
    phone: msisdn,
    channel,
    status: "PENDING",
    transaction_id: null,
    timestamp: new Date().toISOString(),
  };

  const transactions = await readTransactions();
  transactions.push(newTransaction);
  await saveTransactions(transactions);

  console.log(`[PAY] Initiated — Ref: ${reference}, Phone: ${msisdn}, Amount: GHS ${amount}`);

  // ── Call Hubtel Direct Receive Money API ────────────────────────────────
  const credentials = `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`;
  const authToken   = Buffer.from(credentials).toString("base64");

  try {
    const hubtelRes = await axios.post(
      `https://rmp.hubtel.com/merchantaccount/merchants/${process.env.HUBTEL_MERCHANT_ACCOUNT}/receive/mobilemoney`,
      {
        CustomerMsisdn:     msisdn,
        Channel:            channel,
        Amount:             parseFloat(amount),
        PrimaryCallbackUrl: process.env.CALLBACK_URL,
        Description:        `Olearna ${plan} plan`,
        ClientReference:    reference,
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
      message:   "Payment prompt sent to customer's phone.",
      reference,
      status:    "PENDING",
      plan,
      amount,
      phone:     msisdn,
      hubtel:    hubtelRes.data,
    });

  } catch (error) {
    const status = error.response?.status;
    const errDetails = error.response?.data || error.message;
    console.error("[PAY] Hubtel API error:", status, errDetails);

    let userError, tip;
    if (status === 401) {
      userError = "Hubtel authentication failed.";
      tip = "Check HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_MERCHANT_ACCOUNT (POS Sales ID).";
    } else if (status === 403) {
      userError = "Access denied by Hubtel.";
      tip = "Your server IP may not be whitelisted. Contact your Hubtel Retail Systems Engineer to whitelist Vercel's IP addresses.";
    } else if (status >= 500 || !status) {
      userError = "Hubtel's server is currently unavailable. Please try again later.";
      tip = "This is a Hubtel-side issue. Retry in a few minutes.";
    } else {
      userError = `Hubtel error (${errDetails?.ResponseCode || status}).`;
      tip = errDetails?.Message || "Check the details field for more information.";
    }

    return NextResponse.json(
      { error: userError, details: errDetails, reference, tip },
      { status: 502 }
    );
  }
}
