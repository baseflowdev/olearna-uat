"use client";

import { useState, useEffect } from "react";

// ── Inline styles ─────────────────────────────────────────────────────────────

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
    maxWidth: "1100px",
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
  // User state (from signup)
  const [user, setUser] = useState(null);

  // Trial form state
  const [trialPhone,   setTrialPhone]   = useState("");
  const [trialNetwork, setTrialNetwork] = useState("");

  // Subscribe form state
  const [subPhone,   setSubPhone]   = useState("");
  const [subNetwork, setSubNetwork] = useState("");

  // Upgrade form state
  const [upgPhone,   setUpgPhone]   = useState("");
  const [upgNetwork, setUpgNetwork] = useState("");

  // Shared UI state
  const [loading,    setLoading]    = useState(false);
  const [reference,  setReference]  = useState(null);
  const [response,   setResponse]   = useState("Responses will appear here after you click a button above.");
  const [responseOk, setResponseOk] = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [callbackData, setCallbackData] = useState(null);
  const [requestLog, setRequestLog] = useState(null);
  const [frontendLog, setFrontendLog] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("olearna_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        // Pre-fill phone from verified number
        if (parsed.phone) {
          const local = parsed.phone.startsWith("233") ? "0" + parsed.phone.slice(3) : parsed.phone;
          setTrialPhone(local);
          setSubPhone(local);
          setUpgPhone(local);
        }
      } catch {}
    }
  }, []);

  function addLog(msg) {
    setLogs((prev) => [{ msg, time: new Date().toLocaleTimeString() }, ...prev]);
  }

  function showResponse(data, isError = false) {
    setResponse(JSON.stringify(data, null, 2));
    setResponseOk(!isError);
  }

  function logout() {
    localStorage.removeItem("olearna_user");
    setUser(null);
    window.location.href = "/signup";
  }

  // ── Initiate Payment (direct MoMo prompt) ─────────────────────────────────
  async function pay(type) {
    let phone, channel, amount, plan;
    if (type === "trial") {
      phone = trialPhone; channel = trialNetwork; amount = 1; plan = "trial";
    } else if (type === "upgrade") {
      phone = upgPhone; channel = upgNetwork; amount = 10; plan = "premium";
    } else {
      phone = subPhone; channel = subNetwork; amount = 5; plan = "basic";
    }
    const userId = user?.phone || phone;

    if (!phone || !channel) {
      alert("Please fill in Phone Number and select a Mobile Network.");
      return;
    }

    setLoading(true);
    addLog(`Initiating ${plan} payment for ${userId} — GHS ${amount} on ${channel}…`);

    const proxyUrl = process.env.NEXT_PUBLIC_PAYMENT_PROXY_URL || "";
    const payUrl = `${proxyUrl}/pay`;
    const payloadBody = { user_id: userId, amount, plan, phone, channel };
    const sentAt = new Date().toISOString();

    try {
      const res  = await fetch(payUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payloadBody),
      });
      const data = await res.json();
      const receivedAt = new Date().toISOString();

      // Log the frontend → proxy leg
      setFrontendLog({
        from: window.location.origin,
        to: payUrl,
        method: "POST",
        payload: payloadBody,
        sent_at: sentAt,
        response_status: res.status,
        response_body: data,
        received_at: receivedAt,
      });

      if (res.ok) {
        setReference(data.reference);
        setCallbackData(null);
        if (data.request_log) setRequestLog(data.request_log);
        addLog(`Payment prompt sent! Reference: ${data.reference}`);
        showResponse(data, false);
      } else {
        showResponse(data, true);
        addLog("Payment initiation FAILED — see API Response for details.");
      }
    } catch {
      showResponse({ error: "Cannot reach server." }, true);
      setFrontendLog({
        from: window.location.origin,
        to: payUrl,
        method: "POST",
        payload: payloadBody,
        sent_at: sentAt,
        response_status: "NETWORK_ERROR",
        response_body: null,
        received_at: new Date().toISOString(),
      });
      addLog("Server connection error.");
    } finally {
      setLoading(false);
    }
  }

  // ── Check Status ───────────────────────────────────────────────────────────
  async function checkStatus() {
    if (!reference) return alert("No active payment. Click Subscribe or Upgrade first.");
    addLog(`Checking status for ${reference}…`);

    try {
      const proxyUrl = process.env.NEXT_PUBLIC_PAYMENT_PROXY_URL || "";
      const res  = await fetch(`${proxyUrl}/status/${reference}`);
      const data = await res.json();
      showResponse(data, data.status !== "SUCCESS");
      addLog(`Status: ${data.status} | Subscription active: ${data.subscription_active}`);
      if (data.request_log) setRequestLog(data.request_log);
      if (data.raw_callback) {
        setCallbackData({
          status: data.status,
          reference: data.reference,
          callback_received_at: data.callback_received_at,
          raw_callback: data.raw_callback,
        });
      }
    } catch {
      showResponse({ error: "Cannot reach server." }, true);
    }
  }

  const dotColor = responseOk === null ? "#ccc" : responseOk ? "#22c55e" : "#ef4444";

  return (
    <div style={s.body}>

      {/* Header */}
      <header style={s.header}>
        <h1 style={s.h1}>Olearna</h1>
        <p style={s.subtext}>Payment Integration – Hubtel UAT Demo</p>
        <span style={s.badge}>Test Environment – Direct Mobile Money</span>
        {user ? (
          <div style={{ marginTop: "14px", fontSize: "0.9rem", color: "#444" }}>
            Signed in as <strong>{user.name || user.phone}</strong>
            <button onClick={logout} style={{
              marginLeft: "10px", background: "none", border: "1px solid #ccc",
              borderRadius: "6px", padding: "3px 10px", fontSize: "0.8rem",
              cursor: "pointer", color: "#666",
            }}>
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ marginTop: "14px" }}>
            <a href="/signup" style={{
              display: "inline-block", background: "#2d3cc7", color: "white",
              padding: "8px 20px", borderRadius: "8px", textDecoration: "none",
              fontSize: "0.9rem", fontWeight: 600,
            }}>
              Sign up / Verify Phone
            </a>
          </div>
        )}
      </header>

      {/* Payment Cards */}
      <div style={s.cards}>

        {/* Trial */}
        <div style={s.card("#10b981")}>
          <h2 style={s.cardTitle}>Trial</h2>
          <div style={s.price("#10b981")}>GHS 1</div>
          <p style={s.desc}>Try Olearna for 7 days. Full access to core materials.</p>

          <Field label="Phone (MoMo)" id="trial-phone" value={trialPhone} onChange={setTrialPhone} placeholder="e.g. 0241234567" type="tel" />
          <NetworkSelect id="trial-net" value={trialNetwork} onChange={setTrialNetwork} />

          <button style={s.btn("#10b981", loading)} disabled={loading} onClick={() => pay("trial")}>
            {loading ? "Sending…" : "Try — GHS 1"}
          </button>
        </div>

        {/* Subscribe */}
        <div style={s.card("#2d3cc7")}>
          <h2 style={s.cardTitle}>Basic Subscription</h2>
          <div style={s.price("#2d3cc7")}>GHS 5</div>
          <p style={s.desc}>Access to all core learning materials for one month.</p>

          <Field label="Phone (MoMo)" id="sub-phone" value={subPhone}   onChange={setSubPhone}   placeholder="e.g. 0241234567" type="tel" />
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

          <Field label="Phone (MoMo)" id="upg-phone" value={upgPhone}   onChange={setUpgPhone}   placeholder="e.g. 0241234567" type="tel" />
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
            <span style={s.dot("#f59e0b")} /> Payment Sent
          </h3>
          <div style={s.refBox}>{reference}</div>
          <div style={s.infoBox}>
            A <strong>mobile money prompt</strong> has been sent to the customer&apos;s phone.
            Once they approve (or decline), Hubtel calls our <strong>/api/callback</strong>.
            Click below to check the result.
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

      {/* Transaction Logs — Full Round Trip */}
      {(frontendLog || requestLog || callbackData) && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>
            <span style={s.dot(callbackData ? (callbackData.status === "SUCCESS" ? "#22c55e" : "#ef4444") : "#f59e0b")} /> Transaction Logs — Full Round Trip
          </h3>

          {/* Step 1: Frontend (Vercel) → Proxy (DigitalOcean) */}
          {frontendLog && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "#7c3aed", margin: "0 0 8px 0" }}>
                Step 1: Frontend (Vercel) → Payment Proxy (DigitalOcean)
              </h4>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "8px", lineHeight: 1.7 }}>
                <div><strong>From:</strong> <code style={{ background: "#f3e8ff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>{frontendLog.from}</code></div>
                <div><strong>To:</strong> <code style={{ background: "#f3e8ff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>{frontendLog.to}</code></div>
                <div><strong>Method:</strong> {frontendLog.method}</div>
                <div><strong>Sent at:</strong> {new Date(frontendLog.sent_at).toLocaleString()}</div>
                <div><strong>Response status:</strong> {frontendLog.response_status}</div>
                <div><strong>Response received at:</strong> {new Date(frontendLog.received_at).toLocaleString()}</div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#888", margin: "6px 0 4px" }}>Request payload sent to proxy:</p>
              <pre style={s.pre}>{JSON.stringify(frontendLog.payload, null, 2)}</pre>
            </div>
          )}

          {/* Step 2: Proxy (DigitalOcean) → Hubtel API */}
          {requestLog && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "#2d3cc7", margin: "0 0 8px 0" }}>
                Step 2: Payment Proxy (DigitalOcean) → Hubtel API
              </h4>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "8px", lineHeight: 1.7 }}>
                <div><strong>Hubtel API URL:</strong> <code style={{ background: "#eef2ff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>{requestLog.url}</code></div>
                <div><strong>Callback URL registered:</strong> <code style={{ background: "#eef2ff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>{requestLog.callback_url}</code></div>
                <div><strong>Sent at:</strong> {new Date(requestLog.sent_at).toLocaleString()}</div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#888", margin: "6px 0 4px" }}>Payload sent to Hubtel:</p>
              <pre style={s.pre}>{JSON.stringify(requestLog.payload, null, 2)}</pre>
            </div>
          )}

          {/* Step 3: Hubtel API → Proxy (DigitalOcean) initial response */}
          {requestLog?.hubtel_response && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "#0369a1", margin: "0 0 8px 0" }}>
                Step 3: Hubtel API → Payment Proxy (DigitalOcean) — Initial Response
              </h4>
              <pre style={s.pre}>{JSON.stringify(requestLog.hubtel_response, null, 2)}</pre>
            </div>
          )}

          {/* Step 4: Proxy (DigitalOcean) → Frontend (Vercel) response */}
          {frontendLog?.response_body && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "#7c3aed", margin: "0 0 8px 0" }}>
                Step 4: Payment Proxy (DigitalOcean) → Frontend (Vercel) — Response
              </h4>
              <p style={{ fontSize: "0.82rem", color: "#888", margin: "6px 0 4px" }}>Full response received by frontend:</p>
              <pre style={s.pre}>{JSON.stringify(frontendLog.response_body, null, 2)}</pre>
            </div>
          )}

          {/* Step 5: Hubtel → Proxy (DigitalOcean) callback */}
          {callbackData ? (
            <div style={{ marginBottom: "10px" }}>
              <h4 style={{ fontSize: "0.92rem", color: callbackData.status === "SUCCESS" ? "#16a34a" : "#dc2626", margin: "0 0 8px 0" }}>
                Step 5: Hubtel → Payment Proxy (DigitalOcean) — Callback
              </h4>
              <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "8px", lineHeight: 1.7 }}>
                <div><strong>Reference:</strong> {callbackData.reference}</div>
                <div><strong>Final status:</strong>{" "}
                  <span style={{ color: callbackData.status === "SUCCESS" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                    {callbackData.status}
                  </span>
                </div>
                <div><strong>Callback received at:</strong> {callbackData.callback_received_at ? new Date(callbackData.callback_received_at).toLocaleString() : "—"}</div>
                {requestLog?.callback_url && (
                  <div><strong>Callback URL hit:</strong> <code style={{ background: "#eef2ff", padding: "2px 6px", borderRadius: "4px", fontSize: "0.82rem" }}>{requestLog.callback_url}</code></div>
                )}
              </div>
              <pre style={s.pre}>{JSON.stringify(callbackData.raw_callback, null, 2)}</pre>
            </div>
          ) : (
            <div style={{ marginBottom: "10px" }}>
              <h4 style={{ fontSize: "0.92rem", color: "#f59e0b", margin: "0 0 8px 0" }}>Step 5: Hubtel → Payment Proxy (DigitalOcean) — Callback</h4>
              <p style={{ fontSize: "0.85rem", color: "#999" }}>Waiting for callback… Click &quot;Check Payment Status&quot; after approving/declining on your phone.</p>
            </div>
          )}

          {/* Copy All Logs Button */}
          <button
            style={{ ...s.btn("#64748b", false), marginTop: "10px" }}
            onClick={() => {
              const fullLog = {
                step1_frontend_to_proxy: frontendLog || null,
                step2_proxy_to_hubtel: requestLog ? { url: requestLog.url, callback_url: requestLog.callback_url, payload: requestLog.payload, sent_at: requestLog.sent_at } : null,
                step3_hubtel_initial_response: requestLog?.hubtel_response || null,
                step4_proxy_to_frontend: frontendLog?.response_body || null,
                step5_hubtel_callback: callbackData?.raw_callback || null,
                callback_received_at: callbackData?.callback_received_at || null,
                final_status: callbackData?.status || "PENDING",
              };
              navigator.clipboard.writeText(JSON.stringify(fullLog, null, 2));
              addLog("Full round-trip transaction logs copied to clipboard.");
            }}
          >
            Copy Full Round-Trip Log
          </button>
        </div>
      )}

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
