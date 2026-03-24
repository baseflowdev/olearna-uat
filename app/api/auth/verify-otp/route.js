// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/verify-otp
//
//  Verifies the OTP the user entered against what's stored in Redis.
//  On success, creates/updates the user record.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getOtp, deleteOtp, saveUser, getUser } from "@/lib/storage";

export async function POST(request) {
  const { phone, otp, name } = await request.json();

  if (!phone || !otp) {
    return NextResponse.json({ error: "Phone and OTP are required." }, { status: 400 });
  }

  // Normalize phone
  let normalized = phone.replace(/[\s\-\+]/g, "");
  if (normalized.startsWith("0") && normalized.length === 10) {
    normalized = "233" + normalized.slice(1);
  }

  // Get stored OTP
  const storedOtp = await getOtp(normalized);

  if (!storedOtp) {
    return NextResponse.json(
      { error: "OTP expired or not found. Please request a new one." },
      { status: 400 }
    );
  }

  if (String(storedOtp) !== String(otp)) {
    return NextResponse.json({ error: "Invalid OTP. Please try again." }, { status: 400 });
  }

  // OTP is correct — delete it so it can't be reused
  await deleteOtp(normalized);

  // Create or update user
  const existingUser = await getUser(normalized);
  const user = {
    phone:      normalized,
    name:       name || existingUser?.name || "",
    verified:   true,
    created_at: existingUser?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await saveUser(normalized, user);

  console.log(`[OTP] Verified — Phone: ${normalized}, User: ${user.name}`);

  return NextResponse.json({
    message: "Phone verified successfully.",
    user,
  });
}
