import { useState, useEffect, useCallback, useRef } from "react";

const API = "https://7zap-inbox-production.up.railway.app";
const API_KEY = "7zap_inbox_secret";
const TENANT_ID = "98c38c97-2796-471f-bfc9-f093ff3ae6e9";
const REFRESH_INTERVAL = 15; // seconds

const H = { "x-api-key": API_KEY, "Content-Type": "application/json" };

// ─── helpers ────────────────────────────────────────────────────────────────
function ago(isoStr) {
  if (!isoStr) return "—";
  const s = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (s < 60) return `${s}s atrás`;
  if (s < 3600) return `${Math.floor(s/60)}min atrás`;
  if (s < 86400) return `${Math.floor(s/3600)}h atrás`;
  return `${Math.floor(s/86400)}d atrás`;
}
function fmtTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── color system ───────────────────────────────────────────────────────────
const C = {
  bg:       "#0a0e17",
  surface:  "#111827",
  card:     "#141c2e",
  border:   "#1e2d45",
  ok:       "#00e5a0",
  warn:     "#f59e0b",
  err:      "#ff4569",
  blue:     "#3b82f6",
  purple:   "#a855f7",
  text:     "#e2e8f0",
  text2:    "#64748b",
  text3:    "#94a3b8",
};

// ─── sub-components ─────────────────────────────────────────────────────────
function Pill({ ok, children }) {
  const color = ok === true ? C.ok : ok === false ? C.err : C.warn;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      background: color + "18", border: `1px solid ${color}44`,
      color, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      letterSpacing: "0.3px",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {children}
    </span>
  );
}

function Card({ title, icon, children, accent, extra }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden",
      boxShadow: "0 4px 24px #00000040",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(135deg, ${(accent||C.blue)}11, transparent)`,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, flex: 1 }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, ok, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}30` }}>
      <span style={{ color: C.text2, fontSize: 12 }}>{label}</span>
      <span style={{ color: ok === true ? C.ok : ok === false ? C.err : C.text3, fontSize: 12, fontWeight: 600, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function FlowStep({ step, index }) {
  const [open, setOpen] = useState(false);
  const icon = step.ok ? "✓" : "✗";
  const color = step.ok ? C.ok : C.err;
  return (
    <div>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer" }}
      >
        {/* connector line */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
          {index > 0 && <div style={{ width: 2, height: 10, background: C.border, marginBottom: 2 }} />}
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: color + "22", border: `2px solid ${color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color, fontSize: 11, fontWeight: 900,
          }}>{icon}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{step.step}</div>
          {step.detail && <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{step.detail}</div>}
        </div>
        <span style={{ fontSize: 10, color: C.text2 }}>{open ? "▲" : "▼"}</span>
      </div>
    </div>
  );
}

function SessionCard({ s }) {
  const allOk = s.session_ok;
  const accent = allOk ? C.ok : C.err;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${allOk ? C.ok+"33" : C.err+"33"}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${accent}22, ${accent}44)`,
          border: `2px solid ${accent}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>📱</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
            {s.push_name || s.phone || s.name}
          </div>
          <div style={{ fontSize: 11, color: C.text2, fontFamily: "monospace" }}>{s.name}</div>
        </div>
        <Pill ok={s.status_ok}>{s.status}</Pill>
      </div>

      {/* checks grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { label: "WhatsApp WORKING",    ok: s.status_ok },
          { label: "Engine NOWEB",        ok: s.engine === "NOWEB" },
          { label: "Webhook → backend",   ok: s.webhook_points_to_backend },
          { label: "Endpoint correto",    ok: s.webhook_correct_endpoint },
          { label: "Auth key ok",         ok: s.webhook_auth_ok },
          { label: "Mensagens no banco",  ok: !!s.last_db_message_at },
        ].map(ch => (
          <div key={ch.label} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 8px",
            background: ch.ok ? C.ok+"0d" : C.err+"0d",
            border: `1px solid ${ch.ok ? C.ok : C.err}22`,
            borderRadius: 7,
          }}>
            <span style={{ color: ch.ok ? C.ok : C.err, fontSize: 11, fontWeight: 900 }}>{ch.ok ? "✓" : "✗"}</span>
            <span style={{ fontSize: 11, color: C.text2 }}>{ch.label}</span>
          </div>
        ))}
      </div>

      {/* webhook url */}
      <div style={{ marginTop: 10, padding: "8px 10px", background: "#ffffff08", borderRadius: 8 }}>
        <div style={{ fontSize: 10, color: C.text2, marginBottom: 3 }}>WEBHOOK URL</div>
        <div style={{
          fontSize: 11, fontFamily: "monospace",
          color: s.webhook_correct_endpoint ? C.ok : C.err,
          wordBreak: "break-all",
        }}>{s.webhook_url || "Não configurado"}</div>
      </div>

      {s.last_db_message_at && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.text2 }}>
          Última mensagem no banco: <span style={{ color: C.ok }}>{ago(s.last_db_message_at)}</span>
        </div>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
export default function DiagnosticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [log, setLog] = useState([]);
  const countRef = useRef(REFRESH_INTERVAL);

  const addLog = useCallback((msg, type = "info") => {
    const entry = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString("pt-BR") };
    setLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  const fetchDiag = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/health/diagnostics?tenant_id=${TENANT_ID}`,
        { headers: H }
      );
      const d = await r.json();
      setData(d);
      setLastFetch(new Date());
      setError(null);
      countRef.current = REFRESH_INTERVAL;
      setCountdown(REFRESH_INTERVAL);

      // Log insights
      if (d.flow?.all_ok) {
        addLog("✅ Todos os sistemas OK", "ok");
      } else {
        const failing = d.flow?.steps?.filter(s => !s.ok) || [];
        failing.forEach(s => addLog(`❌ ${s.step}: ${s.detail || "falhou"}`, "err"));
      }
      if (d.database?.recent_messages_5min > 0) {
        addLog(`📨 ${d.database.recent_messages_5min} mensagem(ns) nos últimos 5min`, "ok");
      }
    } catch (e) {
      setError(e.message);
      addLog(`🔴 Erro ao buscar diagnóstico: ${e.message}`, "err");
    }
    setLoading(false);
  }, [addLog]);

  // auto-refresh
  useEffect(() => {
    fetchDiag();
    const interval = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        fetchDiag();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchDiag]);

  const db = data?.database || {};
  const waha = data?.waha || {};
  const webhook = data?.webhook || {};
  const flow = data?.flow || {};
  const allOk = flow.all_ok;

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", fontFamily: "'DM Mono', 'JetBrains Mono', 'Fira Code', monospace",
      color: C.text, padding: "0 0 40px 0",
    }}>

      {/* header */}
      <div style={{
        padding: "20px 24px 18px",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `linear-gradient(135deg, ${allOk ? C.ok : C.err}33, ${allOk ? C.ok : C.err}11)`,
            border: `1.5px solid ${allOk ? C.ok : C.err}66`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>
            {loading ? "⏳" : allOk ? "⚡" : "🔴"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px" }}>
              7CRM Diagnostics
            </div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>
              WAHA → Webhook → Backend → Supabase
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Pill ok={allOk}>{allOk ? "TUDO OK" : "ATENÇÃO"}</Pill>
            <div style={{ fontSize: 10, color: C.text2, marginTop: 4 }}>
              {lastFetch ? `atualizado ${fmtTime(lastFetch.toISOString())}` : "carregando..."}
              {" · "}refresh em {countdown}s
            </div>
          </div>
          <button
            onClick={fetchDiag}
            style={{
              padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.surface, color: C.text, cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 900, margin: "0 auto" }}>

        {error && (
          <div style={{ background: C.err+"18", border: `1px solid ${C.err}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: C.err, fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        {/* top stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Msgs 5min",  value: db.recent_messages_5min ?? "—", ok: (db.recent_messages_5min||0) > 0, icon: "📨" },
            { label: "Msgs 1h",    value: db.recent_messages_1h  ?? "—", ok: (db.recent_messages_1h||0) > 0, icon: "📬" },
            { label: "Msgs 24h",   value: db.recent_messages_24h ?? "—", ok: (db.recent_messages_24h||0) > 0, icon: "📭" },
            { label: "Conversas",  value: db.total_conversations  ?? "—", ok: true, icon: "💬" },
          ].map(s => (
            <div key={s.label} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "14px 16px",
              boxShadow: "0 2px 12px #00000030",
            }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.ok ? C.ok : C.text3 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Flow */}
          <Card title="Fluxo de Mensagem" icon="🔄" accent={allOk ? C.ok : C.err}>
            {(flow.steps || []).map((step, i) => (
              <FlowStep key={step.step} step={step} index={i} />
            ))}
            {!data && <div style={{ color: C.text2, fontSize: 12, textAlign: "center", padding: "20px 0" }}>Carregando...</div>}
          </Card>

          {/* Database */}
          <Card title="Banco de Dados" icon="🗄️" accent={C.purple}>
            <Row label="Status"           value={db.ok ? "Conectado" : "Erro"}          ok={db.ok} />
            <Row label="Última mensagem"  value={ago(db.last_message_at)}              ok={!!db.last_message_at} />
            <Row label="Horário"          value={fmtTime(db.last_message_at)}          mono />
            <Row label="Direção"          value={db.last_message_direction || "—"} />
            <Row label="Total conversas"  value={db.total_conversations ?? "—"} />
            <Row label="Msgs nos últimos 5min" value={db.recent_messages_5min ?? "—"} ok={(db.recent_messages_5min||0) > 0} />
            <Row label="Msgs na última 1h"     value={db.recent_messages_1h   ?? "—"} ok={(db.recent_messages_1h||0) > 0} />
            {db.last_message_ago_seconds != null && (
              <div style={{ marginTop: 12, padding: "8px 10px", background: db.last_message_ago_seconds < 300 ? C.ok+"0d" : C.warn+"0d", borderRadius: 8, border: `1px solid ${db.last_message_ago_seconds < 300 ? C.ok : C.warn}22` }}>
                <span style={{ fontSize: 11, color: db.last_message_ago_seconds < 300 ? C.ok : C.warn }}>
                  ⏱ Última mensagem recebida há {db.last_message_ago_seconds}s
                  {db.last_message_ago_seconds > 3600 && " — nenhuma mensagem recente!"}
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* WAHA + Webhook */}
        <Card title={`WAHA — ${waha.sessions?.length || 0} sessão(ões) ativas`} icon="📡" accent={C.blue}
          extra={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {waha.version && <span style={{ fontSize: 10, color: C.text2 }}>v{waha.version} · {waha.engine_default}</span>}
              <Pill ok={waha.ok}>{waha.ok ? "Acessível" : "Erro"}</Pill>
            </div>
          }
        >
          {waha.error && (
            <div style={{ color: C.err, fontSize: 12, marginBottom: 12 }}>⚠️ {waha.error}</div>
          )}
          {(waha.sessions || []).map(s => <SessionCard key={s.name} s={s} />)}
          {(!waha.sessions || waha.sessions.length === 0) && !loading && (
            <div style={{ color: C.text2, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
              Nenhuma sessão encontrada para este tenant
            </div>
          )}
        </Card>

        {/* Live log */}
        <div style={{ marginTop: 16 }}>
          <Card title="Log em Tempo Real" icon="📋" accent={C.text2}>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {log.length === 0 && <div style={{ color: C.text2, fontSize: 11 }}>Aguardando eventos...</div>}
              {log.map(entry => (
                <div key={entry.id} style={{ display: "flex", gap: 10, fontSize: 11, padding: "3px 0" }}>
                  <span style={{ color: C.text2, flexShrink: 0, fontFamily: "monospace" }}>{entry.time}</span>
                  <span style={{ color: entry.type === "ok" ? C.ok : entry.type === "err" ? C.err : C.text3 }}>
                    {entry.msg}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* raw JSON toggle */}
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: C.text2, padding: "8px 0" }}>
            Ver resposta JSON bruta
          </summary>
          <pre style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: 16, fontSize: 10, color: C.text3, overflowX: "auto", marginTop: 8,
            maxHeight: 400, overflowY: "auto",
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>

      </div>
    </div>
  );
}
