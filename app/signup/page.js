"use client";

import { useState } from "react";

const s = {
  body: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4ff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    color: "#1a1a2e",
  },
  card: {
    background: "white",
    borderRadius: "16px",
    padding: "40px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    borderTop: "5px solid #2d3cc7",
  },
  h1: { fontSize: "2rem", color: "#2d3cc7", margin: "0 0 4px 0", textAlign: "center" },
  sub: { color: "#666", fontSize: "0.9rem", textAlign: "center", marginBottom: "28px" },
  label: { display: "block", fontSize: "0.85rem", marginBottom: "4px", color: "#444", fontWeight: 600 },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "1rem",
    marginBottom: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  btn: (bg, disabled) => ({
    width: "100%",
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    background: bg,
    color: "white",
    marginTop: "4px",
  }),
  error: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#991b1b",
    fontSize: "0.88rem",
    marginBottom: "14px",
  },
  success: {
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#166534",
    fontSize: "0.88rem",
    marginBottom: "14px",
  },
  link: { display: "block", textAlign: "center", marginTop: "18px", color: "#2d3cc7", fontSize: "0.9rem" },
  otpRow: { display: "flex", gap: "10px", alignItems: "flex-end" },
  otpInput: {
    flex: 1,
    padding: "12px 14px",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "1.2rem",
    letterSpacing: "6px",
    textAlign: "center",
    outline: "none",
    boxSizing: "border-box",
  },
  resendBtn: {
    padding: "12px 16px",
    border: "1.5px solid #2d3cc7",
    borderRadius: "8px",
    background: "white",
    color: "#2d3cc7",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};

export default function Signup() {
  const [step, setStep]         = useState("phone"); // "phone" | "otp" | "done"
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");

  // ── Step 1: Send OTP ────────────────────────────────────────────────────
  async function sendOtp() {
    if (!name.trim() || !phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res  = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, name }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep("otp");
        setMessage("OTP sent! Check your phone for a text message.");
      } else {
        setError(data.error || "Failed to send OTP.");
      }
    } catch {
      setError("Cannot reach server.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  async function verifyOtp() {
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res  = await fetch("/api/auth/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, otp, name }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep("done");
        // Store user in localStorage so the payment page knows they're verified
        localStorage.setItem("olearna_user", JSON.stringify(data.user));
        setMessage("Phone verified! Redirecting…");
        setTimeout(() => { window.location.href = "/"; }, 1500);
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch {
      setError("Cannot reach server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.body}>
      <div style={s.card}>
        <h1 style={s.h1}>Olearna</h1>
        <p style={s.sub}>
          {step === "phone" && "Sign up with your phone number"}
          {step === "otp"   && "Enter the code sent to your phone"}
          {step === "done"  && "You're all set!"}
        </p>

        {error   && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}

        {/* ── Phone + Name form ─────────────────────────────────────────── */}
        {step === "phone" && (
          <>
            <label style={s.label} htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kwame Mensah"
              style={s.input}
            />

            <label style={s.label} htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0241234567"
              style={s.input}
            />

            <button style={s.btn("#2d3cc7", loading)} disabled={loading} onClick={sendOtp}>
              {loading ? "Sending OTP…" : "Send Verification Code"}
            </button>
          </>
        )}

        {/* ── OTP input ─────────────────────────────────────────────────── */}
        {step === "otp" && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label style={s.label}>Verification Code</label>
              <div style={s.otpRow}>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="------"
                  maxLength={6}
                  style={s.otpInput}
                  autoFocus
                />
                <button style={s.resendBtn} onClick={sendOtp} disabled={loading}>
                  Resend
                </button>
              </div>
            </div>

            <button style={s.btn("#2d3cc7", loading || otp.length < 6)} disabled={loading || otp.length < 6} onClick={verifyOtp}>
              {loading ? "Verifying…" : "Verify & Sign Up"}
            </button>

            <button
              style={{ ...s.resendBtn, width: "100%", marginTop: "12px", border: "none", color: "#666" }}
              onClick={() => { setStep("phone"); setOtp(""); setError(""); setMessage(""); }}
            >
              Change phone number
            </button>
          </>
        )}

        {/* ── Done ──────────────────────────────────────────────────────── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "10px" }}>&#9989;</div>
            <p style={{ color: "#666" }}>Redirecting to payment page…</p>
          </div>
        )}

        {step === "phone" && (
          <a href="/" style={s.link}>Already signed up? Go to payments</a>
        )}
      </div>
    </div>
  );
}
