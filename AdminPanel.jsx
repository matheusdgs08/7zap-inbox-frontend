/**
 * 7CRM — Painel Administrativo (Andressa)
 * Read-only · Requer login com conta superadmin
 *
 * Deploy: hospede como página separada ou rode em /admin
 * Dependências: recharts (disponível via CDN / npm)
 *
 * import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
 *           XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";

const API_URL = "https://7zap-inbox-production.up.railway.app";
const API_KEY = import.meta.env.VITE_API_KEY || "7zap_inbox_secret";

const H = (jwt) => ({
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
  ...(jwt ? { "Authorization": `Bearer ${jwt}` } : {}),
});

// ── Paleta ─────────────────────────────────────────────────────────────────
const C = {
  bg:       "#0f1117",
  surface:  "#1a1d27",
  card:     "#1e2133",
  border:   "#2a2d3e",
  accent:   "#00d4a8",
  accent2:  "#7c5cfc",
  warn:     "#f59e0b",
  danger:   "#f43f5e",
  text:     "#e4e6f0",
  text2:    "#8b8fa8",
  green:    "#10b981",
  blue:     "#3b82f6",
};

const PLAN_COLORS = {
  trial:      "#f59e0b",
  starter:    "#3b82f6",
  pro:        "#7c5cfc",
  business:   "#10b981",
  enterprise: "#00d4a8",
};

const PLAN_PRICES = { trial: 0, starter: 149, pro: 299, business: 599, enterprise: 1200 };

// ── Utility components ──────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "20px 22px", ...style
    }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color = C.accent, icon }) {
  return (
    <Card style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-1px", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text2, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function Badge({ text, color = C.accent }) {
  return (
    <span style={{
      background: color + "22", border: `1px solid ${color}55`, color,
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap"
    }}>{text}</span>
  );
}

function PlanBadge({ plan }) {
  const c = PLAN_COLORS[plan] || C.text2;
  const labels = { trial: "Trial", starter: "Starter", pro: "Pro", business: "Business", enterprise: "Enterprise" };
  return <Badge text={labels[plan] || plan} color={c} />;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`,
        animation: "spin 0.8s linear infinite"
      }} />
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Login screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || "Erro ao fazer login"); return; }
      onLogin(d.token, d.user);
    } catch { setError("Erro de conexão."); }
    setLoading(false);
  };

  const inp = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 14px", color: C.text, fontSize: 14, outline: "none", fontFamily: "inherit",
    boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{ width: 380, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, animation: "fadeIn 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            boxShadow: `0 4px 20px ${C.accent}40` }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#fff" }}>7</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>Painel Admin</div>
          <div style={{ fontSize: 13, color: C.text2, marginTop: 4 }}>Acesso restrito</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={inp} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inp} placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <div style={{ background: "#f43f5e15", border: "1px solid #f43f5e33", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f43f5e" }}>⚠️ {error}</div>}
          <button onClick={submit} disabled={loading}
            style={{ padding: "13px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: `linear-gradient(135deg,${C.accent},${C.accent2})`, color: "#fff", fontSize: 15, fontWeight: 700 }}>
            {loading ? "Entrando..." : "Entrar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tenant detail modal ──────────────────────────────────────────────────────
function TenantModal({ tenantId, jwt, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/superadmin/tenants/${tenantId}`, { headers: H(jwt) })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tenantId]);

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    backdropFilter: "blur(4px)"
  };
  const boxStyle = {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
    width: "100%", maxWidth: 700, maxHeight: "85vh", overflowY: "auto",
    padding: 28, position: "relative"
  };

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={boxStyle}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16,
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.text2, cursor: "pointer", padding: "4px 10px", fontFamily: "inherit", fontSize: 13 }}>✕</button>

        {loading ? <Spinner /> : !data ? <div style={{ color: C.text2 }}>Erro ao carregar</div> : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{data.tenant.name}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PlanBadge plan={data.tenant.plan} />
                <Badge text={data.tenant.segment || "outros"} color={C.blue} />
                {data.tenant.is_blocked && <Badge text="BLOQUEADO" color={C.danger} />}
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 22 }}>
              <KPICard icon="👥" label="Usuários" value={data.users?.length || 0} color={C.accent} />
              <KPICard icon="📱" label="Números" value={data.instances?.length || 0} sub={`${data.connected_phones} conectados`} color={C.green} />
              <KPICard icon="💬" label="Conversas" value={data.conversations_count} sub={`${data.open_conversations} abertas`} color={C.accent2} />
              <KPICard icon="🤖" label="Créditos IA" value={data.tenant.ai_credits ?? "—"} color={C.warn} />
            </div>

            {/* Trial info */}
            {data.tenant.trial_ends_at && (
              <div style={{ background: C.warn + "15", border: `1px solid ${C.warn}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: C.warn }}>
                ⏰ Trial expira em: {new Date(data.tenant.trial_ends_at).toLocaleDateString("pt-BR")}
              </div>
            )}

            {/* Activity chart */}
            {data.activity_last_30d?.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Atividade — últimos 30 dias</div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={data.activity_last_30d}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.accent} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.text2 }} tickFormatter={v => v.slice(5)} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="count" stroke={C.accent} fill="url(#actGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Users */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Usuários</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.users?.map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surface, borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accent2 + "40", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent2 }}>
                      {(u.name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: C.text2 }}>{u.email}</div>
                    </div>
                    <Badge text={u.role} color={u.role === "admin" ? C.accent : C.text2} />
                    {!u.is_active && <Badge text="inativo" color={C.danger} />}
                    {u.last_login && <div style={{ fontSize: 10, color: C.text2 }}>último: {new Date(u.last_login).toLocaleDateString("pt-BR")}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Instances */}
            {data.instances?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Números WhatsApp</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.instances.map(inst => {
                    const connected = ["WORKING","CONNECTED","ONLINE"].includes((inst.status || "").toUpperCase());
                    return (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.surface, borderRadius: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? C.green : C.danger, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: C.text }}>{inst.phone || inst.instance_name}</div>
                          <div style={{ fontSize: 10, color: C.text2 }}>{inst.instance_name}</div>
                        </div>
                        <Badge text={inst.status || "—"} color={connected ? C.green : C.text2} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
function Dashboard({ jwt }) {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | tenants

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/superadmin/dashboard`, { headers: H(jwt) });
      if (r.ok) setStats(await r.json());
    } catch {}
  }, [jwt]);

  const fetchTenants = useCallback(async (pg = 1, s = search) => {
    setLoadingTenants(true);
    try {
      const url = `${API_URL}/superadmin/tenants?page=${pg}&limit=20${s ? `&search=${encodeURIComponent(s)}` : ""}`;
      const r = await fetch(url, { headers: H(jwt) });
      if (r.ok) {
        const d = await r.json();
        setTenants(d.tenants || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      }
    } catch {}
    setLoadingTenants(false);
  }, [jwt, search]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchTenants(1)]).finally(() => setLoading(false));
    const iv = setInterval(fetchStats, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleSearch = () => { setSearch(searchInput); setPage(1); fetchTenants(1, searchInput); };

  const mrr = stats?.mrr_estimate || 0;
  const arr = mrr * 12;

  const SEGMENT_LABELS = { academia: "Academia", clinica: "Clínica", comercio: "Comércio",
    servicos: "Serviços", agencia: "Agência", outros: "Outros" };

  const topbar = { background: C.surface, borderBottom: `1px solid ${C.border}`,
    padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 };

  const tab = (id, label, icon) => (
    <button key={id} onClick={() => setActiveTab(id)}
      style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
        background: activeTab === id ? C.accent + "25" : "transparent",
        color: activeTab === id ? C.accent : C.text2,
        fontFamily: "inherit", fontSize: 13, fontWeight: activeTab === id ? 700 : 500,
        borderBottom: activeTab === id ? `2px solid ${C.accent}` : "2px solid transparent" }}>
      {icon} {label}
    </button>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spinner />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        * { box-sizing: border-box; }
      `}</style>

      {/* Topbar */}
      <div style={topbar}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>7</span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>7CRM Admin</div>
          <div style={{ fontSize: 11, color: C.text2 }}>Painel de Gestão</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: C.text2, background: C.card, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
            🟢 Live · atualiza a cada 60s
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", padding: "6px 12px", borderRadius: 8 }}>
            👁 Somente leitura
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", gap: 4 }}>
        {tab("overview", "Overview", "📊")}
        {tab("tenants", "Tenants", "🏢")}
        {tab("mrr", "Receita", "💰")}
      </div>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && stats && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* KPI row */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
              <KPICard icon="🏢" label="Total tenants" value={stats.total_tenants} color={C.accent} />
              <KPICard icon="💳" label="Pagantes ativos" value={stats.active_paid} color={C.green}
                sub={`R$ ${(stats.mrr_estimate || 0).toLocaleString("pt-BR")}/mês`} />
              <KPICard icon="⏱️" label="Trials ativos" value={stats.active_trials} color={C.warn} />
              <KPICard icon="🔒" label="Expirados/bloq" value={stats.expired_trials} color={C.danger} />
              <KPICard icon="📅" label="Novos este mês" value={stats.new_this_month} color={C.accent2} />
            </div>

            {/* MRR + ARR highlight */}
            <Card style={{ marginBottom: 24, background: `linear-gradient(135deg, ${C.accent}18, ${C.accent2}18)`, border: `1px solid ${C.accent}33` }}>
              <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5 }}>MRR Estimado</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: C.accent, letterSpacing: "-2px" }}>
                    R$ {mrr.toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 12, color: C.text2 }}>receita mensal recorrente</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5 }}>ARR Estimado</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.accent2, letterSpacing: "-1px" }}>
                    R$ {arr.toLocaleString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 12, color: C.text2 }}>receita anual recorrente</div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: 12, color: C.text2, textAlign: "right" }}>
                  <div>Break-even: <strong style={{ color: C.green }}>10 clientes Pro</strong></div>
                  <div>MRR alvo lançamento: <strong style={{ color: C.warn }}>R$ 4.000</strong></div>
                </div>
              </div>
            </Card>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* Monthly signups */}
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                  Novos cadastros por mês
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.monthly_signups || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.text2 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: C.text2 }} />
                    <Tooltip
                      contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: C.text }}
                    />
                    <Bar dataKey="count" fill={C.accent} radius={[4, 4, 0, 0]} name="Cadastros" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Plan distribution */}
              <Card>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                  Distribuição por plano
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={stats.plan_distribution || []}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%" cy="50%"
                      outerRadius={60}
                      innerRadius={35}
                    >
                      {(stats.plan_distribution || []).map((entry, i) => (
                        <Cell key={i} fill={PLAN_COLORS[entry.plan] || C.text2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                    <Legend formatter={(v) => v} iconType="circle" wrapperStyle={{ fontSize: 11, color: C.text2 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Segment distribution */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                Distribuição por segmento
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={stats.segment_distribution || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: C.text2 }} />
                  <YAxis type="category" dataKey="segment" tick={{ fontSize: 11, fill: C.text2 }}
                    tickFormatter={v => SEGMENT_LABELS[v] || v} width={70} />
                  <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill={C.accent2} radius={[0, 4, 4, 0]} name="Tenants" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ── TENANTS TAB ── */}
        {activeTab === "tenants" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* Search */}
            <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Buscar por nome..."
                style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
              <button onClick={handleSearch}
                style={{ padding: "10px 20px", background: C.accent, color: C.bg, border: "none",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>
                Buscar
              </button>
              <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); fetchTenants(1, ""); }}
                style={{ padding: "10px 14px", background: C.surface, color: C.text2, border: `1px solid ${C.border}`,
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                ✕
              </button>
            </div>

            {/* Stats row */}
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 14 }}>
              {total} tenants encontrados
            </div>

            {/* Table */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {loadingTenants ? <Spinner /> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                        {["Empresa", "Plano", "Usuários", "Números", "Conversas", "Criado em", ""].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: C.text2,
                            fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                            whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t, i) => (
                        <tr key={t.id}
                          style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                            background: i % 2 === 0 ? "transparent" : C.surface + "50",
                            transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = C.accent + "12"}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : C.surface + "50"}
                          onClick={() => setSelectedTenant(t.id)}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 600, color: C.text }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: C.text2 }}>{t.segment || "—"}</div>
                            {t.is_blocked && <Badge text="BLOQUEADO" color={C.danger} />}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <PlanBadge plan={t.plan} />
                            {t.trial_info && (
                              <div style={{ fontSize: 10, color: t.trial_info.expired ? C.danger : C.warn, marginTop: 4 }}>
                                {t.trial_info.expired ? "Expirado" : `${t.trial_info.days_left}d restantes`}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.text }}>{t.users_count}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ color: C.text }}>{t.instances_count}</span>
                            {t.instances_count > 0 && (
                              <span style={{ fontSize: 10, color: t.connected_phones > 0 ? C.green : C.danger, marginLeft: 4 }}>
                                ({t.connected_phones} 🟢)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.text }}>{t.conversations_count}</td>
                          <td style={{ padding: "12px 16px", color: C.text2, fontSize: 11, whiteSpace: "nowrap" }}>
                            {t.created_at ? new Date(t.created_at).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <button onClick={e => { e.stopPropagation(); setSelectedTenant(t.id); }}
                              style={{ padding: "5px 12px", background: C.accent + "25", border: `1px solid ${C.accent}44`,
                                color: C.accent, borderRadius: 6, cursor: "pointer", fontSize: 12,
                                fontFamily: "inherit", fontWeight: 600 }}>
                              Ver →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => { setPage(p); fetchTenants(p); }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                      background: p === page ? C.accent : C.card, color: p === page ? C.bg : C.text2,
                      fontFamily: "inherit", fontSize: 13, fontWeight: p === page ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECEITA TAB ── */}
        {activeTab === "mrr" && stats && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
              <KPICard icon="💰" label="MRR" value={`R$ ${(stats.mrr_estimate || 0).toLocaleString("pt-BR")}`} color={C.green} />
              <KPICard icon="📈" label="ARR" value={`R$ ${((stats.mrr_estimate || 0) * 12).toLocaleString("pt-BR")}`} color={C.accent} />
              <KPICard icon="🎯" label="Ticket médio" value={
                stats.active_paid > 0
                  ? `R$ ${Math.round((stats.mrr_estimate || 0) / stats.active_paid).toLocaleString("pt-BR")}`
                  : "—"
              } color={C.accent2} />
              <KPICard icon="📊" label="Taxa conversão" value={
                (stats.total_tenants > 0)
                  ? `${Math.round((stats.active_paid / stats.total_tenants) * 100)}%`
                  : "—"
              } sub="trials → pagantes" color={C.warn} />
            </div>

            {/* Revenue by plan */}
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>
                Receita estimada por plano
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(stats.plan_distribution || []).filter(p => p.plan !== "trial").map(p => ({
                  plano: p.plan,
                  clientes: p.count,
                  receita: p.count * (PLAN_PRICES[p.plan] || 0)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="plano" tick={{ fontSize: 11, fill: C.text2 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: C.text2 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: C.text2 }} />
                  <Tooltip
                    contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => n === "receita" ? [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"] : [v, "Clientes"]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: C.text2 }} />
                  <Bar yAxisId="left" dataKey="clientes" fill={C.accent2} radius={[4, 4, 0, 0]} name="Clientes">
                    {(stats.plan_distribution || []).filter(p => p.plan !== "trial").map((entry, i) => (
                      <Cell key={i} fill={PLAN_COLORS[entry.plan] || C.accent2} />
                    ))}
                  </Bar>
                  <Bar yAxisId="right" dataKey="receita" fill={C.accent} radius={[4, 4, 0, 0]} name="Receita (R$)" opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Breakdown table */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
                Breakdown por plano
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Plano", "Clientes", "Preço/mês", "Subtotal"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.text2,
                        fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(stats.plan_distribution || []).map(p => {
                    const price = PLAN_PRICES[p.plan] || 0;
                    const subtotal = p.count * price;
                    return (
                      <tr key={p.plan} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "10px 12px" }}><PlanBadge plan={p.plan} /></td>
                        <td style={{ padding: "10px 12px", color: C.text }}>{p.count}</td>
                        <td style={{ padding: "10px 12px", color: C.text2 }}>
                          {price > 0 ? `R$ ${price.toLocaleString("pt-BR")}` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700,
                          color: subtotal > 0 ? C.green : C.text2 }}>
                          {subtotal > 0 ? `R$ ${subtotal.toLocaleString("pt-BR")}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: `2px solid ${C.accent}44` }}>
                    <td colSpan={3} style={{ padding: "12px 12px", fontWeight: 800, color: C.text }}>Total MRR</td>
                    <td style={{ padding: "12px 12px", fontWeight: 900, fontSize: 16, color: C.green }}>
                      R$ {(stats.mrr_estimate || 0).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>

      {/* Tenant detail modal */}
      {selectedTenant && (
        <TenantModal tenantId={selectedTenant} jwt={jwt} onClose={() => setSelectedTenant(null)} />
      )}
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [auth, setAuth] = useState(() => {
    try { const s = sessionStorage.getItem("7crm_admin_auth"); return s ? JSON.parse(s) : null; }
    catch { return null; }
  });

  const handleLogin = (token, user) => {
    const a = { token, user };
    sessionStorage.setItem("7crm_admin_auth", JSON.stringify(a));
    setAuth(a);
  };

  if (!auth) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard jwt={auth.token} />;
}
