// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/auth/send-otp
//
//  Generates a 6-digit OTP, stores it in Redis (5 min TTL),
//  and sends it to the user's phone via Hubtel SMS API.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import axios from "axios";
import { saveOtp } from "@/lib/storage";

export async function POST(request) {
  const { phone, name } = await request.json();

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  // Normalize phone: ensure it starts with 233 (Ghana country code)
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return NextResponse.json(
      { error: "Invalid phone number. Use format like 0241234567 or 233241234567." },
      { status: 400 }
    );
  }

  // Generate 6-digit OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  // Save OTP to Redis (expires in 5 minutes)
  await saveOtp(normalized, otp);

  console.log(`[OTP] Generated for ${normalized}: ${otp}`);

  // Send SMS via Hubtel SMS API
  // Uses separate SMS credentials (HUBTEL_SMS_CLIENT_ID / HUBTEL_SMS_CLIENT_SECRET)
  try {
    await axios.get("https://sms.hubtel.com/v1/messages/send", {
      params: {
        clientid:     process.env.HUBTEL_SMS_CLIENT_ID,
        clientsecret: process.env.HUBTEL_SMS_CLIENT_SECRET,
        from:         process.env.HUBTEL_SMS_SENDER_ID || "Olearna",
        to:           normalized,
        content:      `Your Olearna verification code is: ${otp}. Do not share this code with anyone. It expires in 5 minutes.`,
      },
    });

    console.log(`[OTP] SMS sent to ${normalized}`);

    return NextResponse.json({
      message: "OTP sent successfully.",
      phone:   normalized,
    });

  } catch (error) {
    const errDetails = error.response?.data || error.message;
    console.error("[OTP] SMS send failed:", error.response?.status, errDetails);

    return NextResponse.json(
      {
        error:   "Failed to send OTP via SMS.",
        details: errDetails,
        tip:     "Check HUBTEL_SMS_CLIENT_ID and HUBTEL_SMS_CLIENT_SECRET in your environment variables.",
      },
      { status: 502 }
    );
  }
}

function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\+]/g, "");

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "233" + cleaned.slice(1);
  }

  if (/^233\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
}
