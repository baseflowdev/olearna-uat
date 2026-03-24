// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/pay
//
//  Called when a user clicks Subscribe or Upgrade on the frontend.
//  Uses Hubtel Online Checkout API — returns a checkout URL that the
//  customer is redirected to for payment.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import axios from "axios";
import { readTransactions, saveTransactions } from "@/lib/storage";

export async function POST(request) {
  const body = await request.json();
  const { user_id, amount, plan } = body;

  // ── Validate inputs ────────────────────────────────────────────────────────
  if (!user_id || !amount || !plan) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, amount, plan" },
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
    status: "PENDING",
    transaction_id: null,
    timestamp: new Date().toISOString(),
  };

  const transactions = await readTransactions();
  transactions.push(newTransaction);
  await saveTransactions(transactions);

  console.log(`[PAY] Initiated — Ref: ${reference}, Amount: GHS ${amount}`);

  // ── Call Hubtel Online Checkout API ──────────────────────────────────────
  const credentials = `${process.env.HUBTEL_CLIENT_ID}:${process.env.HUBTEL_CLIENT_SECRET}`;
  const authToken   = Buffer.from(credentials).toString("base64");

  // Derive base URL from the request, or use env var
  const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_BASE_URL;

  try {
    const hubtelRes = await axios.post(
      "https://payproxyapi.hubtel.com/items/initiate",
      {
        totalAmount:           parseFloat(amount),
        description:           `Olearna ${plan} plan`,
        callbackUrl:           process.env.CALLBACK_URL,
        returnUrl:             `${origin}/payment-result?reference=${reference}`,
        cancellationUrl:       `${origin}/payment-result?reference=${reference}&cancelled=true`,
        merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT,
        clientReference:       reference,
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

    const checkoutUrl = hubtelRes.data?.data?.checkoutUrl || hubtelRes.data?.data?.checkoutDirectUrl;

    return NextResponse.json({
      message:     "Payment initiated. Redirect customer to checkout.",
      reference,
      status:      "PENDING",
      plan,
      amount,
      checkoutUrl,
      checkoutId:  hubtelRes.data?.data?.checkoutId,
    });

  } catch (error) {
    const status = error.response?.status;
    const errDetails = error.response?.data || error.message;
    console.error("[PAY] Hubtel API error:", status, errDetails);

    let userError, tip;
    if (status === 401 || status === 403) {
      userError = "Hubtel authentication failed. Check your API keys.";
      tip = "Make sure HUBTEL_CLIENT_ID, HUBTEL_CLIENT_SECRET, and HUBTEL_MERCHANT_ACCOUNT are set correctly.";
    } else if (status >= 500 || !status) {
      userError = "Hubtel's server is currently unavailable. Please try again later.";
      tip = "This is a Hubtel-side outage (not an API key issue). Retry in a few minutes.";
    } else {
      userError = "Hubtel API call failed.";
      tip = "Check the details field for more information.";
    }

    return NextResponse.json(
      { error: userError, details: errDetails, reference, tip },
      { status: 502 }
    );
  }
}
