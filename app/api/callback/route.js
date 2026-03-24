// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/callback
//
//  Hubtel calls this endpoint automatically after the customer completes
//  or fails a payment. You do NOT call this yourself.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { readTransactions, saveTransactions } from "@/lib/storage";

export async function POST(request) {
  const body = await request.json();
  console.log("[CALLBACK] Received from Hubtel:", JSON.stringify(body, null, 2));

  // ── Hubtel Online Checkout callback format ───────────────────────────────
  const data            = body?.Data || body;
  const responseCode    = body?.ResponseCode || body?.responseCode;
  const status          = body?.Status || body?.status || data?.Status || data?.status;
  const clientReference = data?.ClientReference || data?.clientReference || body?.ClientReference || body?.clientReference;
  const transactionId   = data?.CheckoutId || data?.SalesInvoiceId || data?.TransactionId || body?.TransactionId;
  const amount          = data?.Amount || body?.Amount;

  if (!clientReference) {
    console.error("[CALLBACK] Missing ClientReference");
    return NextResponse.json({ error: "Missing ClientReference" }, { status: 400 });
  }

  // ── "0000" is Hubtel's success code, "Success" is the status string ─────
  const isSuccess =
    responseCode === "0000" ||
    String(status).toLowerCase() === "success";

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

  return NextResponse.json({
    message:             "Callback received",
    reference:           clientReference,
    status:              finalStatus,
    transaction_id:      transactionId,
    subscription_active: isSuccess,
  });
}
