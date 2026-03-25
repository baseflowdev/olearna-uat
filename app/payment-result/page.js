"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const reference    = searchParams.get("reference");
  const cancelled    = searchParams.get("cancelled");

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) { setLoading(false); return; }

    const proxyUrl = process.env.NEXT_PUBLIC_PAYMENT_PROXY_URL || "";
    fetch(`${proxyUrl}/status/${reference}`)
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ error: "Could not fetch status" }))
      .finally(() => setLoading(false));
  }, [reference]);

  const isSuccess = status?.status === "SUCCESS";
  const isPending = status?.status === "PENDING";

  return (
    <div style={{
      fontFamily: "'Segoe UI', sans-serif",
      background: "#f0f4ff",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 16px",
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        padding: "40px",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        <h1 style={{ fontSize: "2rem", color: "#2d3cc7", marginBottom: "8px" }}>Olearna</h1>

        {cancelled ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>&#10060;</div>
            <h2 style={{ color: "#dc2626" }}>Payment Cancelled</h2>
            <p style={{ color: "#666" }}>You cancelled the payment. No charges were made.</p>
          </>
        ) : loading ? (
          <p style={{ color: "#666" }}>Checking payment status…</p>
        ) : isSuccess ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>&#9989;</div>
            <h2 style={{ color: "#16a34a" }}>Payment Successful</h2>
            <p style={{ color: "#666" }}>
              Your <strong>{status.plan}</strong> subscription is now active.
            </p>
          </>
        ) : isPending ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>&#9203;</div>
            <h2 style={{ color: "#d97706" }}>Payment Pending</h2>
            <p style={{ color: "#666" }}>
              We haven&apos;t received confirmation yet. This may take a moment.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>&#10060;</div>
            <h2 style={{ color: "#dc2626" }}>Payment Failed</h2>
            <p style={{ color: "#666" }}>Something went wrong with your payment.</p>
          </>
        )}

        {reference && (
          <p style={{
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "#999",
            marginTop: "20px",
          }}>
            Ref: {reference}
          </p>
        )}

        <a href="/" style={{
          display: "inline-block",
          marginTop: "20px",
          padding: "12px 28px",
          background: "#2d3cc7",
          color: "white",
          borderRadius: "10px",
          textDecoration: "none",
          fontWeight: 600,
        }}>
          Back to Home
        </a>
      </div>
    </div>
  );
}

export default function PaymentResult() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", padding: "40px" }}>Loading…</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
