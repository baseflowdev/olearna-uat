// ─────────────────────────────────────────────────────────────────────────────
//  storage.js — Handles reading and saving data via Upstash Redis
//
//  Upstash is a free cloud database. It stores your data so it
//  persists even when the server restarts (required for Vercel serverless).
// ─────────────────────────────────────────────────────────────────────────────

import { Redis } from "@upstash/redis";

// Connect to your Upstash database using the keys from .env.local
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const STORAGE_KEY = "olearna_transactions";

// ── Transactions ──────────────────────────────────────────────────────────────

export async function readTransactions() {
  const data = await redis.get(STORAGE_KEY);
  if (!data) return [];
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function saveTransactions(transactions) {
  await redis.set(STORAGE_KEY, JSON.stringify(transactions));
}

// ── OTP ───────────────────────────────────────────────────────────────────────

export async function saveOtp(phone, otp) {
  // Store OTP with 5-minute expiry
  await redis.set(`otp:${phone}`, otp, { ex: 300 });
}

export async function getOtp(phone) {
  return await redis.get(`otp:${phone}`);
}

export async function deleteOtp(phone) {
  await redis.del(`otp:${phone}`);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function saveUser(phone, userData) {
  await redis.set(`user:${phone}`, JSON.stringify(userData));
}

export async function getUser(phone) {
  const data = await redis.get(`user:${phone}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}
