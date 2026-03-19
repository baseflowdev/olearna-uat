// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/transactions
//
//  Returns all transactions ever recorded. Useful during the demo
//  to show the Hubtel team the full audit log.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { readTransactions } from "@/lib/storage";

export async function GET() {
  const transactions = await readTransactions();

  return NextResponse.json({
    total: transactions.length,
    transactions,
  });
}
