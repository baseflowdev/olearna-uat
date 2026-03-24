// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/callback
//
//  Hubtel calls this endpoint automatically after the customer approves
//  or rejects the payment. You do NOT call this yourself.
//
//  Hubtel Direct Receive Money callback format:
//  {
//    "ResponseCode": "0000",        // "0000" = success, anything else = failed
//    "Message": "success",
//    "Data": {
//      "Amount": 0.8,
//      "ClientReference": "OLN...",
//      "TransactionId": "...",
//      "ExternalTransactionId": "...",
//      ...
//    }
//  }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { readTransactions, saveTransactions } from "@/lib/storage";

export async function POST(request) {
  const body = await request.json();
  console.log("[CALLBACK] Received from Hubtel:", JSON.stringify(body, null, 2));

  // ── Parse the callback payload ───────────────────────────────────────────
  const responseCode    = body?.ResponseCode;
  const data            = body?.Data || {};
  const clientReference = data?.ClientReference || body?.ClientReference;
  const transactionId   = data?.TransactionId;

  if (!clientReference) {
    console.error("[CALLBACK] Missing ClientReference");
    return NextResponse.json({ error: "Missing ClientReference" }, { status: 400 });
  }

  // ── "0000" is Hubtel's success code ─────────────────────────────────────
  const isSuccess = responseCode === "0000";
  const finalStatus = isSuccess ? "SUCCESS" : "FAILED";

  // ── Find and update the transaction ───────────────────────────────────────
  const transactions = await readTransactions();
  const index = transactions.findIndex((t) => t.reference === clientReference);

  if (index === -1) {
    console.error(`[CALLBACK] No transaction found for: ${clientReference}`);
    return NextResponse.json(
      { error: `No transaction with reference: ${clientReference}` },
      { status: 404 }
    );
  }

  transactions[index].status               = finalStatus;
  transactions[index].transaction_id       = transactionId || null;
  transactions[index].subscription_active  = isSuccess;
  transactions[index].callback_received_at = new Date().toISOString();
  transactions[index].raw_callback         = body;

  await saveTransactions(transactions);

  console.log(`[CALLBACK] Updated: ${clientReference} → ${finalStatus}`);

  // ── Always return 200 so Hubtel knows we received it ───────────────────
  return NextResponse.json({
    message:             "Callback received",
    reference:           clientReference,
    status:              finalStatus,
    transaction_id:      transactionId,
    subscription_active: isSuccess,
  });
}
