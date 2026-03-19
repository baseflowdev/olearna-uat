// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/status/:reference
//
//  Returns the current status of a payment.
//  Example: GET /api/status/OLN-1710000000000
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { readTransactions } from "@/lib/storage";

export async function GET(request, { params }) {
  const { reference } = params;

  const transactions  = await readTransactions();
  const transaction   = transactions.find((t) => t.reference === reference);

  if (!transaction) {
    return NextResponse.json(
      { error: `No transaction found with reference: ${reference}` },
      { status: 404 }
    );
  }

  console.log(`[STATUS] ${reference} → ${transaction.status}`);

  return NextResponse.json({
    reference:           transaction.reference,
    user_id:             transaction.user_id,
    plan:                transaction.plan,
    amount:              transaction.amount,
    status:              transaction.status,
    transaction_id:      transaction.transaction_id,
    subscription_active: transaction.subscription_active || false,
    timestamp:           transaction.timestamp,
  });
}
