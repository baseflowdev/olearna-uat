"use client";

import { useState } from "react";

// ── Inline styles (no setup needed, works everywhere) ─────────────────────────

const s = {
  body: {
    fontFamily: "'Segoe UI', sans-serif",
    background: "#f0f4ff",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 16px",
    color: "#1a1a2e",
  },
  header: { textAlign: "center", marginBottom: "40px" },
  h1: { fontSize: "2rem", color: "#2d3cc7", margin: 0 },
  subtext: { color: "#555", marginTop: "6px", fontSize: "0.95rem" },
  badge: {
    display: "inline-block",
    background: "#fff3cd",
    color: "#856404",
    border: "1px solid #ffc107",
    borderRadius: "20px",
    padding: "4px 14px",
    fontSize: "0.8rem",
    marginTop: "10px",
  },
  cards: {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: "800px",
  },
  card: (accent) => ({
    background: "white",
    borderRadius: "16px",
    padding: "30px",
    width: "340px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    borderTop: `5px solid ${accent}`,
  }),
  cardTitle: { fontSize: "1.2rem", marginBottom: "6px", margin: 0 },
  price: (color) => ({
    fontSize: "2rem",
    fontWeight: 700,
    color,
    margin: "10px 0",
  }),
  desc: { color: "#666", fontSize: "0.9rem", marginBottom: "20px", lineHeight: 1.5 },
  label: {
    display: "block",
    fontSize: "0.85rem",
    marginBottom: "4px",
    color: "#444",
    fontWeight: 600,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "0.95rem",
    marginBottom: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    border: "1.5px solid #ddd",
    borderRadius: "8px",
    fontSize: "0.95rem",
    marginBottom: "14px",
    outline: "none",
    background: "white",
    boxSizing: "border-box",
  },
  btn: (bg, disabled) => ({
    width: "100%",
    padding: "13px",
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
  section: {
    background: "white",
    borderRadius: "16px",
    padding: "24px 28px",
    width: "100%",
    maxWidth: "800px",
    marginTop: "28px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    fontSize: "1rem",
    color: "#444",
    marginBottom: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "0 0 14px 0",
  },
  refBox: {
    background: "#eef2ff",
    border: "1.5px dashed #2d3cc7",
    borderRadius: "10px",
    padding: "12px 16px",
    fontFamily: "monospace",
    fontSize: "1rem",
    color: "#2d3cc7",
    marginBottom: "14px",
    wordBreak: "break-all",
  },
  infoBox: {
    background: "#fffbeb",
    border: "1.5px solid #fcd34d",
    borderRadius: "10px",
    padding: "14px 16px",
    fontSize: "0.88rem",
    color: "#78350f",
    marginBottom: "14px",
    lineHeight: 1.6,
  },
  pre: {
    background: "#1e1e2e",
    color: "#cdd6f4",
    padding: "16px",
    borderRadius: "10px",
    fontSize: "0.85rem",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: 1.6,
    minHeight: "60px",
    margin: 0,
  },
  logEntry: {
    borderLeft: "3px solid #2d3cc7",
    padding: "6px 12px",
    marginBottom: "8px",
    fontSize: "0.85rem",
    color: "#333",
    background: "#f8faff",
    borderRadius: "0 6px 6px 0",
  },
  dot: (color) => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: color || "#ccc",
    display: "inline-block",
  }),
};

// ── Reusable form field components ────────────────────────────────────────────

function Field({ label, id, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label style={s.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={s.input}
      />
    </div>
  );
}

function NetworkSelect({ id, value, onChange }) {
  return (
    <div>
      <label style={s.label} htmlFor={id}>Mobile Network</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} style={s.select}>
        <option value="">— Select network —</option>
        <option value="mtn-gh">MTN Mobile Money</option>
        <option value="vodafone-gh">Vodafone Cash</option>
        <option value="tigo-gh">AirtelTigo Money</option>
      </select>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  // Subscribe form state
  const [subUserId,  setSubUserId]  = useState("student_001");
  const [subPhone,   setSubPhone]   = useState("");
  const [subNetwork, setSubNetwork] = useState("");

  // Upgrade form state
  const [upgUserId,  setUpgUserId]  = useState("student_001");
  const [upgPhone,   setUpgPhone]   = useState("");
  const [upgNetwork, setUpgNetwork] = useState("");

  // Shared UI state
  const [loading,    setLoading]    = useState(false);
  const [reference,  setReference]  = useState(null);
  const [response,   setResponse]   = useState("Responses will appear here after you click a button above.");
  const [responseOk, setResponseOk] = useState(null); // true=green, false=red, null=grey
  const [logs,       setLogs]       = useState([]);

  function addLog(msg) {
    setLogs((prev) => [{ msg, time: new Date().toLocaleTimeString() }, ...prev]);
  }

  function showResponse(data, isError = false) {
    setResponse(JSON.stringify(data, null, 2));
    setResponseOk(!isError);
  }

  // ── Step 1: Initiate Payment ───────────────────────────────────────────────
  async function pay(type) {
    const isUpgrade = type === "upgrade";
    const userId    = isUpgrade ? upgUserId  : subUserId;
    const phone     = isUpgrade ? upgPhone   : subPhone;
    const channel   = isUpgrade ? upgNetwork : subNetwork;
    const amount    = isUpgrade ? 10 : 5;
    const plan      = isUpgrade ? "premium" : "basic";

    if (!userId || !phone || !channel) {
      alert("Please fill in User ID, Phone Number, and select a Mobile Network.");
      return;
    }

    setLoading(true);
    addLog(`Initiating ${plan} payment for ${userId} — GHS ${amount} on ${channel}…`);

    try {
      const res  = await fetch("/api/pay", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, amount, plan, phone, channel }),
      });
      const data = await res.json();

      if (res.ok) {
        setReference(data.reference);
        addLog(`Hubtel accepted. Reference: ${data.reference}`);
        showResponse(data, false);
      } else {
        showResponse(data, true);
        addLog("Payment initiation FAILED — see API Response for details.");
      }
    } catch {
      showResponse({ error: "Cannot reach server." }, true);
      addLog("Server connection error.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Check Status ───────────────────────────────────────────────────
  async function checkStatus() {
    if (!reference) return alert("No active payment. Click Subscribe or Upgrade first.");
    addLog(`Checking status for ${reference}…`);

    try {
      const res  = await fetch(`/api/status/${reference}`);
      const data = await res.json();
      showResponse(data, data.status !== "SUCCESS");
      addLog(`Status: ${data.status} | Subscription active: ${data.subscription_active}`);
    } catch {
      showResponse({ error: "Cannot reach server." }, true);
    }
  }

  // ── Dot colour ────────────────────────────────────────────────────────────
  const dotColor = responseOk === null ? "#ccc" : responseOk ? "#22c55e" : "#ef4444";

  return (
    <div style={s.body}>

      {/* Header */}
      <header style={s.header}>
        <h1 style={s.h1}>Olearna</h1>
        <p style={s.subtext}>Payment Integration – Hubtel UAT Demo</p>
        <span style={s.badge}>Test Environment – Real Hubtel API</span>
      </header>

      {/* Payment Cards */}
      <div style={s.cards}>

        {/* Subscribe */}
        <div style={s.card("#2d3cc7")}>
          <h2 style={s.cardTitle}>Basic Subscription</h2>
          <div style={s.price("#2d3cc7")}>GHS 5</div>
          <p style={s.desc}>Access to all core learning materials for one month.</p>

          <Field label="User ID"        id="sub-uid"   value={subUserId}  onChange={setSubUserId}  placeholder="e.g. student_001" />
          <Field label="Phone (MoMo)"   id="sub-phone" value={subPhone}   onChange={setSubPhone}   placeholder="e.g. 0241234567" type="tel" />
          <NetworkSelect id="sub-net" value={subNetwork} onChange={setSubNetwork} />

          <button style={s.btn("#2d3cc7", loading)} disabled={loading} onClick={() => pay("subscribe")}>
            {loading ? "Sending…" : "Subscribe — GHS 5"}
          </button>
        </div>

        {/* Upgrade */}
        <div style={s.card("#7c3aed")}>
          <h2 style={s.cardTitle}>Upgrade to Premium</h2>
          <div style={s.price("#7c3aed")}>GHS 10</div>
          <p style={s.desc}>Unlock live sessions, mentors, and advanced content.</p>

          <Field label="User ID"        id="upg-uid"   value={upgUserId}  onChange={setUpgUserId}  placeholder="e.g. student_001" />
          <Field label="Phone (MoMo)"   id="upg-phone" value={upgPhone}   onChange={setUpgPhone}   placeholder="e.g. 0241234567" type="tel" />
          <NetworkSelect id="upg-net" value={upgNetwork} onChange={setUpgNetwork} />

          <button style={s.btn("#7c3aed", loading)} disabled={loading} onClick={() => pay("upgrade")}>
            {loading ? "Sending…" : "Upgrade — GHS 10"}
          </button>
        </div>

      </div>

      {/* After payment is initiated */}
      {reference && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>
            <span style={s.dot("#f59e0b")} /> Payment Sent to Hubtel
          </h3>
          <div style={s.refBox}>{reference}</div>
          <div style={s.infoBox}>
            The customer will receive a <strong>mobile money prompt on their phone</strong>.
            Once they approve (or decline), Hubtel automatically calls our{" "}
            <strong>/api/callback</strong> endpoint. Click below to check the result.
          </div>
          <button style={s.btn("#0369a1", false)} onClick={checkStatus}>
            Check Payment Status
          </button>
        </div>
      )}

      {/* API Response */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>
          <span style={s.dot(dotColor)} /> API Response
        </h3>
        <pre style={s.pre}>{response}</pre>
      </div>

      {/* Activity Log */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Activity Log</h3>
        {logs.length === 0 ? (
          <p style={{ color: "#999", fontSize: "0.85rem" }}>No activity yet.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={s.logEntry}>
              <span style={{ color: "#999", fontSize: "0.78rem" }}>{log.time}</span>
              {"  "}{log.msg}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
