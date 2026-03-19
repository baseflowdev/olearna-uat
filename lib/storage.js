// ─────────────────────────────────────────────────────────────────────────────
//  storage.js — Handles reading and saving transactions via Upstash Redis
//
//  Upstash is a free cloud database. It stores your transactions so they
//  persist even when the server restarts (required for Vercel serverless).
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

// Connect to your Upstash database using the keys from .env.local
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const STORAGE_KEY = "olearna_transactions";

// Read all transactions from Redis
export async function readTransactions() {
  const data = await redis.get(STORAGE_KEY);
  if (!data) return [];
  // If Redis returns a string, parse it; if already an object, use as-is
  return typeof data === "string" ? JSON.parse(data) : data;
}

// Save all transactions back to Redis
export async function saveTransactions(transactions) {
  await redis.set(STORAGE_KEY, JSON.stringify(transactions));
}
