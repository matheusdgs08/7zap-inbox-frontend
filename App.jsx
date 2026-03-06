import { useState, useEffect, useRef, useCallback } from "react";
const API_URL = "https://7zap-inbox-production.up.railway.app";
const API_KEY = "7zap_inbox_secret";
const TENANT_ID = "98c38c97-2796-471f-bfc9-f093ff3ae6e9";
const headers = { "x-api-key": API_KEY, "Content-Type": "application/json" };

// Auth helpers
const authHeaders = (token) => ({ ...headers, "Authorization": `Bearer ${token}` });
const getStoredAuth = () => { try { return JSON.parse(localStorage.getItem("7crm_auth") || "null"); } catch { return null; } };
const setStoredAuth = (data) => { if (data) localStorage.setItem("7crm_auth", JSON.stringify(data)); else localStorage.removeItem("7crm_auth"); };

function timeAgo(dateStr) {
  const now = new Date(); const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
function initials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function uid() { return Math.random().toString(36).slice(2, 10); }

const DEFAULT_COLUMNS = [
  { id: "new", label: "Nova", color: "#7c4dff" },
  { id: "attending", label: "Em Atendimento", color: "#00c853" },
  { id: "waiting", label: "Aguardando", color: "#ffd600" },
  { id: "resolved", label: "Resolvida", color: "#555555" },
];
const PALETTE = ["#00c853","#00bcd4","#7c4dff","#ff6d00","#e91e63","#3d5afe","#f44336","#8bc34a","#ffd600","#ff5722","#9c27b0","#555555"];

const STATUS_OPTIONS = [
  { id: "open",     label: "Aberto",    color: "#00c853", icon: "▶" },
  { id: "pending",  label: "Pendente",  color: "#ffd600", icon: "⏸" },
  { id: "resolved", label: "Resolvido", color: "#555",    icon: "✓" },
];

const DEFAULT_LABELS_INIT = [
  { id: "lead",      name: "Lead quente", color: "#00c853" },
  { id: "doubt",     name: "Dúvida",      color: "#00bcd4" },
  { id: "complaint", name: "Reclamação",  color: "#f44336" },
  { id: "renewal",   name: "Renovação",   color: "#ff6d00" },
  { id: "financial", name: "Financeiro",  color: "#7c4dff" },
];

function loadLabels() {
  try { const s = localStorage.getItem("7zap_labels"); if (s) return JSON.parse(s); } catch (e) {}
  return DEFAULT_LABELS_INIT;
}
function saveLabels(labels) { try { localStorage.setItem("7zap_labels", JSON.stringify(labels)); } catch (e) {} }
function loadColumns() {
  try { const s = localStorage.getItem("7zap_kanban_columns"); if (s) return JSON.parse(s); } catch (e) {}
  return DEFAULT_COLUMNS;
}
function saveColumns(cols) { try { localStorage.setItem("7zap_kanban_columns", JSON.stringify(cols)); } catch (e) {} }

function Avatar({ name, size = 36 }) {
  const colors = ["#00c853","#00bcd4","#7c4dff","#ff6d00","#e91e63","#3d5afe"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  return <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: "inherit" }}>{initials(name)}</div>;
}
function StatusDot({ status }) {
  const colors = { open: "#00c853", pending: "#ffd600", resolved: "#555" };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || "#555", display: "inline-block", flexShrink: 0 }} />;
}
function LabelChip({ label, onRemove }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: label.color + "22", border: `1px solid ${label.color}44`, color: label.color, fontSize: 11, fontWeight: 600 }}>{label.name}{onRemove && <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.7, marginLeft: 2 }}>×</span>}</span>;
}
function KanbanBadge({ stage, columns }) {
  if (!stage || stage === "new") return null;
  const col = columns.find(c => c.id === stage);
  if (!col) return null;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: col.color + "22", border: `1px solid ${col.color}44`, color: col.color, fontSize: 11, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: col.color, display: "inline-block" }} />{col.label}</span>;
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, border: `1px solid ${current.color}44`, background: current.color + "15", color: current.color, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: current.color, display: "inline-block" }} />
        {current.label}
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "110%", right: 0, background: "#13131f", border: "1px solid #252540", borderRadius: 10, padding: 6, minWidth: 160, zIndex: 200, boxShadow: "0 12px 32px #00000070" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#444", padding: "4px 10px 6px", letterSpacing: 1 }}>ALTERAR STATUS</div>
          {STATUS_OPTIONS.map(opt => (
            <div
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 7, cursor: "pointer", background: status === opt.id ? opt.color + "18" : "transparent" }}
              onMouseEnter={e => e.currentTarget.style.background = opt.color + "18"}
              onMouseLeave={e => e.currentTarget.style.background = status === opt.id ? opt.color + "18" : "transparent"}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: status === opt.id ? opt.color : "#ccc" }}>{opt.label}</span>
              {status === opt.id && <span style={{ marginLeft: "auto", color: opt.color, fontSize: 12 }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Label Manager Modal ──────────────────────────────────────────────────────
function LabelManagerModal({ labels, onChange, onClose }) {
  const [items, setItems] = useState(labels.map(l => ({ ...l })));
  const [editingId, setEditingId] = useState(null);
  const [pickingColorFor, setPickingColorFor] = useState(null);
  const [newName, setNewName] = useState("");
  const update = (id, patch) => setItems(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  const remove = (id) => setItems(prev => prev.filter(l => l.id !== id));
  const addLabel = () => {
    if (!newName.trim()) return;
    setItems(prev => [...prev, { id: uid(), name: newName.trim(), color: PALETTE[prev.length % PALETTE.length] }]);
    setNewName("");
  };
  const save = () => { onChange(items); saveLabels(items); onClose(); };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 14, padding: 24, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px #00000080" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🏷 Gerenciar Etiquetas</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Crie, renomeie, recolora ou remova etiquetas</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {items.map(label => (
            <div key={label.id} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d0d18", border: "1px solid #252540", borderRadius: 10, padding: "10px 14px" }}>
                <div
                  onClick={() => setPickingColorFor(pickingColorFor === label.id ? null : label.id)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: label.color, cursor: "pointer", flexShrink: 0, border: "2px solid #252540" }}
                />
                {editingId === label.id
                  ? <input autoFocus value={label.name} onChange={e => update(label.id, { name: e.target.value })} onBlur={() => setEditingId(null)} onKeyDown={e => e.key === "Enter" && setEditingId(null)} style={{ flex: 1, background: "#1a1a2e", border: `1px solid ${label.color}66`, borderRadius: 6, color: "#e8e8f0", fontSize: 13, padding: "4px 10px", outline: "none", fontFamily: "inherit" }} />
                  : <span onClick={() => setEditingId(label.id)} style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: "text", color: label.color }}>{label.name}</span>
                }
                <span onClick={() => setEditingId(label.id)} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }}>✏️</span>
                <span onClick={() => remove(label.id)} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }}>🗑</span>
              </div>
              {pickingColorFor === label.id && (
                <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 300, background: "#1a1a2e", border: "1px solid #252540", borderRadius: 10, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, width: 200, boxShadow: "0 8px 24px #00000060" }}>
                  {PALETTE.map(c => (
                    <div key={c} onClick={() => { update(label.id, { color: c }); setPickingColorFor(null); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: label.color === c ? "3px solid #fff" : "2px solid transparent" }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Nova etiqueta</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addLabel()} placeholder="Nome da etiqueta..." style={{ flex: 1, padding: "8px 12px", background: "#0d0d18", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={addLabel} disabled={!newName.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: newName.trim() ? "linear-gradient(135deg, #00c853, #00796b)" : "#1a1a2e", color: newName.trim() ? "#000" : "#444", fontSize: 13, fontWeight: 700, cursor: newName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>+ Criar</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={save} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00c853, #00796b)", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 Salvar etiquetas</button>
        </div>
      </div>
    </div>
  );
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const d = await r.json();
      if (!r.ok) { setError(d.detail || "Erro ao fazer login"); setLoading(false); return; }
      onLogin(d);
    } catch (e) { setError("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  // Blocked screen — trial expired
  if (trialInfo?.is_blocked) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0a0a0f", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif", flexDirection: "column", gap: 0 }}>
        <div style={{ width: 480, padding: "40px 36px", background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 20, boxShadow: "0 32px 80px #00000080", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#e8e8f0" }}>Seu trial de 7 dias encerrou</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Escolha um plano para continuar usando o 7CRM. Seus dados estão seguros e serão mantidos.</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              { plan: "starter", label: "Starter", price: "R$ 149/mês", desc: "1 número · 5 atendentes · Sem IA", color: "#00bcd4" },
              { plan: "pro", label: "Pro ⭐", price: "R$ 299/mês", desc: "3 números · 15 atendentes · Co-pilot IA + Onboarding", color: "#00c853", highlight: true },
              { plan: "business", label: "Business", price: "R$ 599/mês", desc: "8 números · 30 atendentes · IA · White-label", color: "#7c4dff" },
            ].map(p => (
              <div key={p.plan} onClick={async () => {
                await fetch(`${API_URL}/tenant/activate-plan`, { method: "POST", headers, body: JSON.stringify({ tenant_id: TENANT_ID, plan: p.plan }) });
                fetchTrialStatus();
              }} style={{ padding: "14px 20px", borderRadius: 12, border: `2px solid ${p.highlight ? p.color : "#1a1a2e"}`, background: p.highlight ? `${p.color}15` : "#13131f", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "all 0.2s" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.color, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{p.desc}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#e8e8f0", whiteSpace: "nowrap" }}>{p.price}</div>
                <span style={{ color: p.color, fontSize: 16 }}>→</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#333" }}>
            Para pagamento via PIX ou boleto, fale via WhatsApp · <span style={{ color: "#00c853" }}>Estúdio Se7e</span>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a2e" }}>
            <button onClick={onLogout} style={{ background: "transparent", border: "none", color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sair da conta</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0a0a0f", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ width: 400, padding: "40px 36px", background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 20, boxShadow: "0 32px 80px #00000080" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
          <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="url(#glogin)"/>
            <defs><linearGradient id="glogin" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#00c853"/><stop offset="100%" stopColor="#00695c"/></linearGradient></defs>
            <text x="4" y="20" fontSize="14" fontWeight="900" fill="white" fontFamily="sans-serif">7</text>
            <circle cx="19" cy="14" r="5" fill="none" stroke="white" strokeWidth="2"/>
            <line x1="19" y1="9" x2="19" y2="19" stroke="white" strokeWidth="1.5"/>
            <line x1="14" y1="14" x2="24" y2="14" stroke="white" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", color: "#e8e8f0" }}>7<span style={{ color: "#00c853" }}>CRM</span></span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 4, color: "#e8e8f0" }}>Bem-vindo de volta</div>
        <div style={{ fontSize: 13, color: "#555", textAlign: "center", marginBottom: 28 }}>Entre com seu email e senha</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="seu@email.com.br" autoFocus style={{ width: "100%", padding: "11px 14px", background: "#13131f", border: `1px solid ${error ? "#f4433644" : "#252540"}`, borderRadius: 10, color: "#e8e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 6 }}>SENHA</label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="••••••••" style={{ width: "100%", padding: "11px 40px 11px 14px", background: "#13131f", border: `1px solid ${error ? "#f4433644" : "#252540"}`, borderRadius: 10, color: "#e8e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <span onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#555", fontSize: 16 }}>{showPw ? "🙈" : "👁"}</span>
            </div>
          </div>
          {error && <div style={{ background: "#f4433315", border: "1px solid #f4433333", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f44336" }}>❌ {error}</div>}
          <button onClick={submit} disabled={loading || !email.trim() || !password.trim()} style={{ marginTop: 4, padding: "13px 0", borderRadius: 10, border: "none", background: (!loading && email.trim() && password.trim()) ? "linear-gradient(135deg,#00c853,#00796b)" : "#1a1a2e", color: (!loading && email.trim() && password.trim()) ? "#000" : "#444", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {loading ? "Entrando..." : "Entrar →"}
          </button>
        </div>
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#333" }}>7CRM v1.0 · Estúdio Se7e</div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ auth, onLogout }) {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [fName, setFName] = useState(""); const [fEmail, setFEmail] = useState(""); const [fPw, setFPw] = useState(""); const [fRole, setFRole] = useState("agent"); const [fColor, setFColor] = useState("#00c853"); const [saving, setSaving] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false); const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [changingPw, setChangingPw] = useState(false);

  const aHeaders = { ...headers, "Authorization": `Bearer ${auth.token}` };
  const showToast = (msg, color = "#00c853") => { setToast({ msg, color }); setTimeout(() => setToast(null), 3500); };

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await fetch(`${API_URL}/admin/users`, { headers: aHeaders }); const d = await r.json(); setUsers(d.users || []); } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setEditUser(null); setFName(""); setFEmail(""); setFPw(""); setFRole("agent"); setFColor("#00c853"); setShowForm(true); };
  const openEdit = (u) => { setEditUser(u); setFName(u.name); setFEmail(u.email); setFPw(""); setFRole(u.role); setFColor(u.avatar_color || "#00c853"); setShowForm(true); };

  const saveUser = async () => {
    if (!fName.trim() || !fEmail.trim() || (!editUser && !fPw.trim())) return;
    setSaving(true);
    try {
      if (editUser) {
        const body = { name: fName, email: fEmail, role: fRole, avatar_color: fColor };
        if (fPw.trim()) body.password = fPw;
        await fetch(`${API_URL}/admin/users/${editUser.id}`, { method: "PUT", headers: aHeaders, body: JSON.stringify(body) });
        showToast("✓ Usuário atualizado!");
      } else {
        await fetch(`${API_URL}/admin/users`, { method: "POST", headers: aHeaders, body: JSON.stringify({ tenant_id: auth.user.tenant_id, name: fName, email: fEmail, password: fPw, role: fRole, avatar_color: fColor }) });
        showToast("✓ Usuário criado!");
      }
      setShowForm(false); fetchUsers();
    } catch (e) { showToast("Erro ao salvar", "#f44336"); }
    setSaving(false);
  };

  const toggleActive = async (u) => {
    await fetch(`${API_URL}/admin/users/${u.id}`, { method: "PUT", headers: aHeaders, body: JSON.stringify({ is_active: !u.is_active }) });
    showToast(u.is_active ? "Usuário desativado" : "Usuário reativado", u.is_active ? "#f44336" : "#00c853");
    fetchUsers();
  };

  const changePw = async () => {
    if (!curPw || newPw.length < 6 || changingPw) return;
    setChangingPw(true);
    try {
      const r = await fetch(`${API_URL}/auth/change-password`, { method: "POST", headers: aHeaders, body: JSON.stringify({ current_password: curPw, new_password: newPw }) });
      if (r.ok) { showToast("✓ Senha alterada!"); setShowChangePw(false); setCurPw(""); setNewPw(""); }
      else { const d = await r.json(); showToast(d.detail || "Erro", "#f44336"); }
    } catch (e) {}
    setChangingPw(false);
  };

  const COLORS = ["#00c853","#7c4dff","#00bcd4","#ff6d00","#f44336","#e91e63","#ffd600","#8bc34a"];
  const inp = { width: "100%", padding: "9px 12px", background: "#13131f", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.color, color: "#000", padding: "11px 22px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 32px #00000060" }}>{toast.msg}</div>}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 3, background: "#0a0a0f", border: "1px solid #1a1a2e", borderRadius: 8, padding: 3 }}>
          {[["users","👥 Usuários"],["account","👤 Minha conta"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: tab === id ? "#1a1a2e" : "transparent", color: tab === id ? "#e8e8f0" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {tab === "users" && (
          <div style={{ maxWidth: 860 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
              <div><div style={{ fontSize: 18, fontWeight: 700 }}>👥 Usuários</div><div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Gerencie quem tem acesso ao 7CRM</div></div>
              <button onClick={openCreate} style={{ marginLeft: "auto", padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#00c853,#00796b)", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ Novo usuário</button>
            </div>
            {loading ? <div style={{ color: "#555", padding: 40, textAlign: "center" }}>Carregando...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {users.map(u => (
                  <div key={u.id} style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, opacity: u.is_active ? 1 : 0.5 }}>
                    <Avatar name={u.name} size={40} color={u.avatar_color} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{u.name}</span>
                        <span style={{ fontSize: 11, background: u.role === "admin" ? "#7c4dff22" : "#00c85322", color: u.role === "admin" ? "#a78bfa" : "#00c853", padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>{u.role === "admin" ? "Admin" : "Atendente"}</span>
                        {!u.is_active && <span style={{ fontSize: 11, background: "#f4433322", color: "#f44336", padding: "1px 8px", borderRadius: 20 }}>Inativo</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>{u.email}</div>
                      {u.last_login && <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>Último acesso: {new Date(u.last_login).toLocaleString("pt-BR")}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✏️ Editar</button>
                      {u.id !== auth.user.id && <button onClick={() => toggleActive(u)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${u.is_active ? "#f4433333" : "#00c85333"}`, background: "transparent", color: u.is_active ? "#f44336" : "#00c853", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{u.is_active ? "Desativar" : "Reativar"}</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "account" && (
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>👤 Minha conta</div>
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <Avatar name={auth.user.name} size={52} color={auth.user.avatar_color} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{auth.user.name}</div>
                  <div style={{ fontSize: 13, color: "#555" }}>{auth.user.email}</div>
                  <span style={{ fontSize: 11, background: auth.user.role === "admin" ? "#7c4dff22" : "#00c85522", color: auth.user.role === "admin" ? "#a78bfa" : "#00c853", display: "inline-block", padding: "2px 10px", borderRadius: 20, marginTop: 4, fontWeight: 700 }}>{auth.user.role === "admin" ? "Administrador" : "Atendente"}</span>
                </div>
              </div>
              <button onClick={() => setShowChangePw(p => !p)} style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>🔑 Alterar senha</button>
              {showChangePw && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} placeholder="Senha atual" style={inp} />
                  <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" style={inp} />
                  <button onClick={changePw} disabled={changingPw || !curPw || newPw.length < 6} style={{ padding: "9px 0", borderRadius: 8, border: "none", background: (!changingPw && curPw && newPw.length >= 6) ? "linear-gradient(135deg,#00c853,#00796b)" : "#1a1a2e", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{changingPw ? "Salvando..." : "Salvar nova senha"}</button>
                </div>
              )}
            </div>
            <button onClick={onLogout} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid #f4433333", background: "transparent", color: "#f44336", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Sair da conta →</button>
          </div>
        )}
      </div>
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{editUser ? "Editar usuário" : "Novo usuário"}</span>
              <span onClick={() => setShowForm(false)} style={{ marginLeft: "auto", cursor: "pointer", color: "#555", fontSize: 20 }}>×</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>NOME</label><input value={fName} onChange={e => setFName(e.target.value)} placeholder="Nome completo" style={inp} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>EMAIL</label><input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="email@empresa.com" style={inp} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>{editUser ? "NOVA SENHA (vazio = não alterar)" : "SENHA"}</label><input type="password" value={fPw} onChange={e => setFPw(e.target.value)} placeholder="••••••••" style={inp} /></div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 5 }}>PAPEL</label>
                <select value={fRole} onChange={e => setFRole(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                  <option value="agent">Atendente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div><label style={{ fontSize: 11, fontWeight: 700, color: "#555", display: "block", marginBottom: 8 }}>COR DO AVATAR</label>
                <div style={{ display: "flex", gap: 8 }}>{COLORS.map(c => <div key={c} onClick={() => setFColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: fColor === c ? "3px solid #fff" : "3px solid transparent", boxSizing: "border-box" }} />)}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
                <button onClick={saveUser} disabled={saving} style={{ flex: 2, padding: "10px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#00c853,#00796b)", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "Salvando..." : (editUser ? "Salvar" : "Criar usuário")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Onboarding Inteligente ───────────────────────────────────────────────────
function OnboardingView({ auth }) {
  const [step, setStep] = useState("intro"); // intro | analyzing | result | done
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const analyze = async () => {
    setLoading(true); setError(""); setStep("analyzing"); setProgress(0);
    
    // Simula progresso enquanto aguarda
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 90));
    }, 800);

    try {
      const r = await fetch(`${API_URL}/onboarding/analyze`, {
        method: "POST", headers,
        body: JSON.stringify({ tenant_id: TENANT_ID, days })
      });
      const d = await r.json();
      clearInterval(progressInterval);
      if (!r.ok) { setError(d.detail || "Erro na análise"); setStep("intro"); setLoading(false); return; }
      setProgress(100);
      setTimeout(() => {
        setResult(d);
        setEditedPrompt(d.generated_prompt);
        setStep("result");
      }, 500);
    } catch (e) {
      clearInterval(progressInterval);
      setError("Erro de conexão. Tente novamente.");
      setStep("intro");
    }
    setLoading(false);
  };

  const savePrompt = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/onboarding/save-prompt`, {
        method: "POST", headers,
        body: JSON.stringify({ tenant_id: TENANT_ID, prompt: editedPrompt })
      });
      setSaved(true);
      setTimeout(() => setStep("done"), 800);
    } catch (e) {}
    setSaving(false);
  };

  const inp = { width: "100%", padding: "9px 12px", background: "#13131f", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* ── INTRO ── */}
        {step === "intro" && (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🧠 Onboarding Inteligente</div>
              <div style={{ fontSize: 13, color: "#555" }}>A IA lê seu histórico do WhatsApp e aprende como sua empresa funciona</div>
            </div>

            {/* How it works */}
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Como funciona</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { n: "1", title: "Seleciona o período", desc: "Escolha quantos dias de histórico a IA vai analisar", icon: "📅" },
                  { n: "2", title: "IA analisa as conversas", desc: "Nossa IA lê até 200 conversas e identifica padrões do seu negócio", icon: "🔍" },
                  { n: "3", title: "Prompt gerado automaticamente", desc: "Tom de voz, FAQ, produtos e regras da sua empresa — tudo automatico", icon: "✨" },
                  { n: "4", title: "Revise e ative", desc: "Edite se quiser e salve. Co-pilot começa a usar imediatamente", icon: "🚀" },
                ].map(s => (
                  <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00c85320", border: "1px solid #00c85340", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e8f0", marginBottom: 2 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: "#555" }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Period selector */}
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>📅 Período de análise</div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>Mais dias = análise mais rica. Recomendamos 90 dias.</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[30, 60, 90, 180].map(d => (
                  <button key={d} onClick={() => setDays(d)} style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: `2px solid ${days === d ? "#00c853" : "#252540"}`, background: days === d ? "#00c85315" : "#13131f", color: days === d ? "#00c853" : "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {d} dias
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: "#f4433315", border: "1px solid #f4433333", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#f44336", marginBottom: 16 }}>❌ {error}</div>}

            {/* Warning */}
            <div style={{ background: "#7c4dff15", border: "1px solid #7c4dff33", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#a78bfa", marginBottom: 20 }}>
              ⚡ Disponível apenas nos planos <strong>Pro</strong> (200 conversas) e <strong>Business</strong> (500 conversas). Uso: 1x por mês.
            </div>

            <button onClick={analyze} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #00c853, #00796b)", color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              🧠 Analisar meu histórico e gerar prompt →
            </button>
          </>
        )}

        {/* ── ANALYZING ── */}
        {step === "analyzing" && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>🧠</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Analisando suas conversas...</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 40 }}>Nossa IA está lendo o histórico e aprendendo sobre seu negócio. Isso pode levar até 60 segundos.</div>
            
            {/* Progress bar */}
            <div style={{ background: "#1a1a2e", borderRadius: 20, height: 8, marginBottom: 12, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 20, background: "linear-gradient(90deg, #00c853, #00bcd4)", width: `${progress}%`, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>{Math.round(progress)}% concluído</div>

            <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 10, textAlign: "left", background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20 }}>
              {[
                { label: "Buscando conversas...", done: progress > 15 },
                { label: "Lendo mensagens...", done: progress > 35 },
                { label: "Identificando padrões...", done: progress > 60 },
                { label: "Gerando prompt personalizado...", done: progress > 85 },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: s.done ? "#00c853" : "#333" }}>
                  <span>{s.done ? "✓" : "⏳"}</span>
                  {s.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {step === "result" && result && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>✨ Prompt gerado!</div>
              <div style={{ fontSize: 13, color: "#555" }}>
                Analisamos <strong style={{ color: "#00c853" }}>{result.conversations_analyzed} conversas</strong> dos últimos <strong style={{ color: "#00c853" }}>{result.days_analyzed} dias</strong>. Revise e salve.
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Conversas analisadas", value: result.conversations_analyzed, color: "#00c853" },
                { label: "Dias de histórico", value: result.days_analyzed, color: "#00bcd4" },
                { label: "Créditos usados", value: "~50", color: "#7c4dff" },
              ].map(s => (
                <div key={s.label} style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Editable prompt */}
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>📝 Prompt gerado pela IA</div>
                <span style={{ fontSize: 11, background: "#00c85322", color: "#00c853", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>editável</span>
              </div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 12 }}>Personalize à vontade antes de salvar. Este será o "cérebro" do Co-pilot.</div>
              <textarea
                value={editedPrompt}
                onChange={e => setEditedPrompt(e.target.value)}
                rows={16}
                style={{ width: "100%", padding: "14px 16px", background: "#13131f", border: "1px solid #252540", borderRadius: 10, color: "#e8e8f0", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "monospace", lineHeight: 1.6, boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{editedPrompt.length} caracteres</div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("intro")} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #252540", background: "transparent", color: "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>← Refazer</button>
              <button onClick={savePrompt} disabled={saving || !editedPrompt.trim()} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: saved ? "#00c853" : "linear-gradient(135deg,#00c853,#00796b)", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "Salvando..." : saved ? "✓ Salvo!" : "🚀 Salvar e ativar Co-pilot →"}
              </button>
            </div>
          </>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Co-pilot configurado!</div>
            <div style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Seu Co-pilot agora conhece sua empresa. Abra uma conversa no Inbox e clique em ✨ para ver a mágica.</div>
            <div style={{ background: "#00c85315", border: "1px solid #00c85333", borderRadius: 14, padding: 24, marginBottom: 32, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#00c853", marginBottom: 12 }}>O que mudou:</div>
              {["Co-pilot agora usa o prompt personalizado da sua empresa", "Sugestões de resposta muito mais precisas e no tom certo", "FAQ automático baseado nas suas perguntas reais", "Você pode refinar o prompt a qualquer momento em Configurações"].map(f => (
                <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: "#888", marginBottom: 8 }}><span style={{ color: "#00c853" }}>✓</span>{f}</div>
              ))}
            </div>
            <button onClick={() => setStep("intro")} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid #252540", background: "transparent", color: "#555", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginRight: 10 }}>Refazer análise</button>
          </div>
        )}

      </div>
    </div>
  );
}


// ─── WhatsApp Connection Screen ───────────────────────────────────────────────
function WhatsAppScreen({ auth }) {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [instance, setInstance] = useState("default");
  const [loadingQr, setLoadingQr] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [phone, setPhone] = useState("");
  const pollRef = useRef(null);

  const checkStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/whatsapp/status?instance=${instance}`, { headers });
      const d = await r.json();
      setStatus(d.connected ? "connected" : "disconnected");
      setPhone(d.phone || "");
      setLastCheck(new Date());
      if (d.connected) setQrCode("");
    } catch (e) { setStatus("error"); }
  };

  const fetchQrCode = async () => {
    setLoadingQr(true); setQrCode("");
    try {
      const r = await fetch(`${API_URL}/whatsapp/qrcode?instance=${instance}`, { headers });
      const d = await r.json();
      if (d.qr_code) setQrCode(d.qr_code);
      else if (d.state === "open") { setStatus("connected"); }
    } catch (e) {}
    setLoadingQr(false);
  };

  const disconnect = async () => {
    if (!window.confirm("Deseja desconectar o WhatsApp? Nenhuma mensagem será recebida até reconectar.")) return;
    setDisconnecting(true);
    try {
      await fetch(`${API_URL}/whatsapp/disconnect`, { method: "POST", headers, body: JSON.stringify({ instance }) });
      setStatus("disconnected"); setQrCode(""); setPhone("");
    } catch (e) {}
    setDisconnecting(false);
  };

  useEffect(() => {
    checkStatus();
    pollRef.current = setInterval(checkStatus, 8000);
    return () => clearInterval(pollRef.current);
  }, [instance]);

  useEffect(() => {
    if (status === "disconnected" && !qrCode && !loadingQr) fetchQrCode();
  }, [status]);

  const isConnected = status === "connected";
  const statusColor = isConnected ? "#00c853" : status === "error" ? "#ff6d00" : "#f44336";
  const statusLabel = isConnected ? "Conectado" : status === "error" ? "Erro de conexão" : status === "disconnected" ? "Desconectado" : "Verificando...";
  const statusIcon = isConnected ? "🟢" : status === "error" ? "🟠" : status === "disconnected" ? "🔴" : "⏳";

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>📱 Conexão WhatsApp</div>
          <div style={{ fontSize: 13, color: "#555" }}>Gerencie a conexão do seu número com o 7CRM</div>
        </div>

        {/* Status Card */}
        <div style={{ background: "#0d0d18", border: `1px solid ${statusColor}44`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `${statusColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
              {isConnected ? "📱" : "📵"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                {isConnected ? (phone ? `+${phone}` : "Número conectado") : "Número da recepção"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>{statusIcon}</span>
                <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                {lastCheck && <span style={{ fontSize: 11, color: "#333" }}>· {timeAgo(lastCheck.toISOString())}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={checkStatus} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>🔄 Atualizar</button>
              {isConnected && (
                <button onClick={disconnect} disabled={disconnecting} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #f4433344", background: "transparent", color: "#f44336", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  {disconnecting ? "..." : "Desconectar"}
                </button>
              )}
            </div>
          </div>

          {/* Instance input */}
          <div style={{ padding: "10px 14px", background: "#13131f", border: "1px solid #1a1a2e", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "#555", fontWeight: 700, whiteSpace: "nowrap" }}>INSTÂNCIA</span>
            <input value={instance} onChange={e => { setInstance(e.target.value); setStatus(null); setQrCode(""); }} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit" }} placeholder="default" />
            <span style={{ fontSize: 11, color: "#333" }}>nome da instância na Evolution API</span>
          </div>
        </div>

        {/* QR Code Card — só quando desconectado */}
        {(status === "disconnected" || status === "error") && (
          <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>📷 Conectar via QR Code</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
              Abra o WhatsApp no celular → <strong style={{ color: "#e8e8f0" }}>Menu (⋮)</strong> → <strong style={{ color: "#e8e8f0" }}>Dispositivos conectados</strong> → <strong style={{ color: "#e8e8f0" }}>Adicionar dispositivo</strong>
            </div>

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              {/* QR */}
              <div style={{ flexShrink: 0 }}>
                {loadingQr ? (
                  <div style={{ width: 180, height: 180, background: "#13131f", borderRadius: 12, border: "2px solid #1a1a2e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, border: "3px solid #1a1a2e", borderTop: "3px solid #00c853", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 11, color: "#555" }}>Gerando...</span>
                  </div>
                ) : qrCode ? (
                  <div>
                    <img src={qrCode} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 12, border: "3px solid #00c85344", display: "block" }} />
                    <div style={{ fontSize: 10, color: "#555", marginTop: 6, textAlign: "center" }}>Válido por ~60 segundos</div>
                  </div>
                ) : (
                  <div style={{ width: 180, height: 180, background: "#13131f", border: "2px dashed #252540", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "#333" }}>Sem QR Code</span>
                  </div>
                )}
              </div>

              {/* Steps */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#888" }}>Passo a passo:</div>
                {[
                  "Abra o WhatsApp no celular",
                  "Toque nos 3 pontos (⋮) no canto superior",
                  "Selecione 'Dispositivos conectados'",
                  "Toque em 'Adicionar dispositivo'",
                  "Aponte a câmera para o QR Code ao lado",
                  "Aguarde 5 segundos — pronto! ✅",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#00c85320", border: "1px solid #00c85340", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#00c853", flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 12, color: "#666", paddingTop: 2 }}>{step}</span>
                  </div>
                ))}
                <button onClick={fetchQrCode} disabled={loadingQr} style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: loadingQr ? "#1a1a2e" : "linear-gradient(135deg,#00c853,#00796b)", color: loadingQr ? "#444" : "#000", fontSize: 13, fontWeight: 700, cursor: loadingQr ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  {loadingQr ? "Gerando QR Code..." : qrCode ? "🔄 Novo QR Code" : "📷 Gerar QR Code"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connected state info */}
        {isConnected && (
          <div style={{ background: "#00c85310", border: "1px solid #00c85330", borderRadius: 14, padding: 20, marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontSize: 32 }}>✅</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#00c853", marginBottom: 4 }}>WhatsApp conectado e recebendo mensagens</div>
              <div style={{ fontSize: 12, color: "#555" }}>Todas as mensagens recebidas nesse número aparecem automaticamente no Inbox. O status é verificado a cada 8 segundos.</div>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 14 }}>ℹ️ Informações importantes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "⚠️", title: "API não oficial", desc: "Usa WhatsApp Web. Pode desconectar 2-3x por ano — basta gerar novo QR Code.", color: "#ff6d00" },
              { icon: "💾", title: "Dados seguros", desc: "Mensagens salvas no banco mesmo quando desconectado. Nenhum dado é perdido.", color: "#00c853" },
              { icon: "⚡", title: "Reconexão em 2 min", desc: "Se desconectar, clique em 'Gerar QR Code' e escaneie novamente. Rápido e simples.", color: "#00bcd4" },
              { icon: "🔄", title: "Monitoramento automático", desc: "O painel verifica o status a cada 8 segundos e avisa se cair.", color: "#7c4dff" },
            ].map(item => (
              <div key={item.title} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "#13131f", borderRadius: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Leads Board (por etiqueta) ───────────────────────────────────────────────

// ─── Broadcasts / Disparos View ──────────────────────────────────────────────
function BroadcastsView({ conversations, labels, agents, kanbanCols }) {
  const [tab, setTab] = useState("new"); // new | queue | scheduled
  const [broadcasts, setBroadcasts] = useState([]);
  const [scheduledMsgs, setScheduledMsgs] = useState([]);
  const [loading, setLoading] = useState(false);

  // New broadcast form state
  const [bName, setBName] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bIntervalMin, setBIntervalMin] = useState(60);
  const [bIntervalMax, setBIntervalMax] = useState(120);
  const [bScheduledAt, setBScheduledAt] = useState("");
  const [bFilter, setBFilter] = useState("manual"); // manual | label | kanban | status | csv
  const [bFilterValue, setBFilterValue] = useState("");
  const [bRecipients, setBRecipients] = useState([]); // [{phone,name}]
  const [csvText, setCsvText] = useState("");
  const [creating, setCreating] = useState(false);
  const [aiObjective, setAiObjective] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  // Scheduled form
  const [sPhone, setSPhone] = useState("");
  const [sName, setSName] = useState("");
  const [sMessage, setSMessage] = useState("");
  const [sDate, setSDate] = useState("");
  const [sRecurrence, setSRecurrence] = useState("");
  const [sConvId, setSConvId] = useState("");
  const [creatingSched, setCreatingSched] = useState(false);

  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [toast, setToast] = useState(null); // {msg, color}

  const showToast = (msg, color = "#00c853") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/broadcasts?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      setBroadcasts(d.broadcasts || []);
    } catch (e) {}
    setLoading(false);
  };
  const fetchScheduled = async () => {
    try {
      const r = await fetch(`${API_URL}/scheduled-messages?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      setScheduledMsgs(d.scheduled_messages || []);
    } catch (e) {}
  };

  useEffect(() => {
    if (tab === "queue") fetchBroadcasts();
    if (tab === "scheduled") fetchScheduled();
  }, [tab]);

  // Build recipients from filter
  const buildRecipients = () => {
    if (bFilter === "manual") return bRecipients;
    if (bFilter === "csv") {
      return csvText.split("\n").map(line => {
        const [phone, name] = line.split(",").map(s => s.trim());
        return phone ? { phone: phone.replace(/\D/g, ""), name: name || "" } : null;
      }).filter(Boolean);
    }
    let convs = conversations;
    if (bFilter === "label" && bFilterValue) convs = convs.filter(c => (c.labels || []).some(l => l.id === bFilterValue));
    if (bFilter === "kanban" && bFilterValue) convs = convs.filter(c => c.kanban_stage === bFilterValue);
    if (bFilter === "status" && bFilterValue) convs = convs.filter(c => c.status === bFilterValue);
    return convs.map(c => ({ phone: c.contacts?.phone?.replace(/\D/g, "") || "", name: c.contacts?.name || "", contact_id: c.contact_id })).filter(r => r.phone);
  };

  const previewRecipients = buildRecipients();

  const suggestWithAI = async () => {
    if (!aiObjective.trim() || loadingAI) return;
    setLoadingAI(true);
    try {
      const r = await fetch(`${API_URL}/broadcasts/suggest-message`, { method: "POST", headers, body: JSON.stringify({ tenant_id: TENANT_ID, objective: aiObjective }) });
      const d = await r.json();
      setBMessage(d.suggestion || "");
    } catch (e) {}
    setLoadingAI(false);
  };

  const createBroadcast = async () => {
    const recs = buildRecipients();
    if (!bName.trim() || !bMessage.trim() || recs.length === 0 || creating) return;
    if (bIntervalMin < 60) { alert("⚠️ Intervalo mínimo é 60 segundos para evitar ban!"); return; }
    setCreating(true);
    try {
      await fetch(`${API_URL}/broadcasts`, { method: "POST", headers, body: JSON.stringify({
        tenant_id: TENANT_ID, name: bName, message: bMessage,
        interval_min: bIntervalMin, interval_max: bIntervalMax,
        scheduled_at: bScheduledAt || null, recipients: recs
      })});
      setBName(""); setBMessage(""); setBIntervalMin(60); setBIntervalMax(120); setBScheduledAt(""); setBRecipients([]); setCsvText(""); setAiObjective("");
      setTab("queue"); fetchBroadcasts();
      showToast(bScheduledAt ? "📅 Disparo agendado! Veja na aba Fila ✓" : "🚀 Disparo iniciado! Acompanhe na Fila ✓");
    } catch (e) {}
    setCreating(false);
  };

  const cancelBroadcast = async (id) => {
    await fetch(`${API_URL}/broadcasts/${id}/cancel`, { method: "PUT", headers });
    fetchBroadcasts();
  };

  const createScheduled = async () => {
    if (!sPhone.trim() || !sMessage.trim() || !sDate || creatingSched) return;
    setCreatingSched(true);
    try {
      await fetch(`${API_URL}/scheduled-messages`, { method: "POST", headers, body: JSON.stringify({
        tenant_id: TENANT_ID, contact_phone: sPhone.replace(/\D/g, ""), contact_name: sName,
        message: sMessage, scheduled_at: sDate, recurrence: sRecurrence || null,
        conversation_id: sConvId || null
      })});
      setSPhone(""); setSName(""); setSMessage(""); setSDate(""); setSRecurrence(""); setSConvId("");
      await fetchScheduled();
      setTab("scheduled");
      showToast("📅 Mensagem agendada! Veja em Agendamentos ✓");
    } catch (e) {}
    setCreatingSched(false);
  };

  const deleteScheduled = async (id) => {
    await fetch(`${API_URL}/scheduled-messages/${id}`, { method: "DELETE", headers });
    setScheduledMsgs(prev => prev.filter(m => m.id !== id));
  };

  const STATUS_COLORS = { pending: "#ffd600", sending: "#00bcd4", done: "#00c853", cancelled: "#555", failed: "#f44336", scheduled: "#7c4dff" };
  const STATUS_LABELS = { pending: "⏳ Aguardando", sending: "📤 Enviando", done: "✅ Concluído", cancelled: "🚫 Cancelado", failed: "❌ Falhou", scheduled: "📅 Agendado" };
  const RECURRENCE_LABELS = { daily: "Diário", weekly: "Semanal", monthly: "Mensal" };

  const inputStyle = { width: "100%", padding: "9px 12px", background: "#0d0d18", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 6, display: "block" };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.color, color: "#000", padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 32px #00000060", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          {toast.msg}
          <span onClick={() => setToast(null)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 16 }}>×</span>
        </div>
      )}
      {/* Header tabs */}
      <div style={{ padding: "10px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 9, padding: 3 }}>
          {[["new","✏️ Novo disparo"],["queue","📋 Fila"],["scheduled","📅 Agendamentos"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: tab === id ? "#1a1a2e" : "transparent", color: tab === id ? "#e8e8f0" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
          <span style={{ background: "#f4433322", border: "1px solid #f4433344", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#f44336", fontWeight: 600 }}>⚠️ Intervalo mín. 60s</span>
          <span style={{ background: "#ff6d0022", border: "1px solid #ff6d0044", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#ff6d00", fontWeight: 600 }}>⚠️ Contatos sem histórico = risco de ban</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* ── NEW BROADCAST ── */}
        {tab === "new" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, maxWidth: 1100 }}>
            {/* Left: form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>NOME DO DISPARO</label>
                <input value={bName} onChange={e => setBName(e.target.value)} placeholder="Ex: Promoção de Janeiro" style={inputStyle} />
              </div>

              {/* AI message helper */}
              <div style={{ background: "#130f1f", border: "1px solid #7c4dff33", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span>✨</span><span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>Sugestão de mensagem com IA</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={aiObjective} onChange={e => setAiObjective(e.target.value)} onKeyDown={e => e.key === "Enter" && suggestWithAI()} placeholder="Ex: Relembrar alunos inativos, promoção de plano anual..." style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={suggestWithAI} disabled={loadingAI || !aiObjective.trim()} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: aiObjective.trim() ? "linear-gradient(135deg,#7c4dff,#5b21b6)" : "#1a1a2e", color: aiObjective.trim() ? "#fff" : "#444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>{loadingAI ? "⏳" : "✨ Gerar"}</button>
                </div>
                <div style={{ fontSize: 11, color: "#555" }}>Use {"{nome}"} para personalizar com o nome do contato</div>
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>MENSAGEM <span style={{ color: "#555", fontWeight: 400 }}>— use {"{nome}"} para personalizar</span></label>
                <textarea value={bMessage} onChange={e => setBMessage(e.target.value)} placeholder="Olá {nome}, temos uma novidade especial para você..." rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {["{nome}", "{telefone}"].map(v => (
                    <span key={v} onClick={() => setBMessage(m => m + v)} style={{ fontSize: 11, background: "#1a1a2e", color: "#888", padding: "2px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "monospace" }}>{v}</span>
                  ))}
                </div>
              </div>

              {/* Interval config */}
              <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>⏱ Intervalo entre mensagens</div>
                <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Enviar de X a Y segundos entre cada mensagem. Nunca abaixo de 60s.</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>MÍNIMO (segundos)</label>
                    <input type="number" min={60} max={600} value={bIntervalMin} onChange={e => setBIntervalMin(Math.max(60, parseInt(e.target.value) || 60))} style={inputStyle} />
                  </div>
                  <div style={{ color: "#555", paddingTop: 20 }}>→</div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>MÁXIMO (segundos)</label>
                    <input type="number" min={bIntervalMin} max={3600} value={bIntervalMax} onChange={e => setBIntervalMax(Math.max(bIntervalMin, parseInt(e.target.value) || 120))} style={inputStyle} />
                  </div>
                </div>
                {bIntervalMin < 60 && <div style={{ marginTop: 8, color: "#f44336", fontSize: 11, fontWeight: 600 }}>⚠️ Mínimo de 60 segundos para evitar ban no WhatsApp!</div>}
                <div style={{ marginTop: 10, fontSize: 11, color: "#444" }}>Com {previewRecipients.length} destinatários e intervalo de ~{Math.round((bIntervalMin + bIntervalMax)/2)}s, o disparo levará ~{Math.round(previewRecipients.length * (bIntervalMin + bIntervalMax)/2 / 60)} minutos.</div>
              </div>

              {/* Schedule */}
              <div>
                <label style={labelStyle}>AGENDAR PARA (opcional — deixe vazio para enviar agora)</label>
                <input type="datetime-local" value={bScheduledAt} onChange={e => setBScheduledAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
            </div>

            {/* Right: recipients */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: 16, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>👥 Destinatários</div>

                {/* Filter selector */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {[["manual","✋ Manual"],["label","🏷 Etiqueta"],["kanban","🗂 Kanban"],["status","● Status"],["csv","📄 CSV"]].map(([id, label]) => (
                    <button key={id} onClick={() => { setBFilter(id); setBFilterValue(""); }} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${bFilter === id ? "#00c85344" : "#252540"}`, background: bFilter === id ? "#00c85315" : "transparent", color: bFilter === id ? "#00c853" : "#666", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
                  ))}
                </div>

                {/* Filter content */}
                {bFilter === "label" && (
                  <select value={bFilterValue} onChange={e => setBFilterValue(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                    <option value="">Selecione uma etiqueta...</option>
                    {labels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
                {bFilter === "kanban" && (
                  <select value={bFilterValue} onChange={e => setBFilterValue(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                    <option value="">Selecione coluna do Kanban...</option>
                    {kanbanCols.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
                {bFilter === "status" && (
                  <select value={bFilterValue} onChange={e => setBFilterValue(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
                    <option value="">Selecione status...</option>
                    <option value="open">Abertos</option>
                    <option value="pending">Pendentes</option>
                    <option value="resolved">Resolvidos</option>
                  </select>
                )}
                {bFilter === "csv" && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Cole aqui: <code style={{ color: "#888" }}>55119999999, Nome</code> (um por linha)</div>
                    <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={5} placeholder={"5511999999999, João Silva\n5511888888888, Maria"} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} />
                  </div>
                )}
                {bFilter === "manual" && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>Selecione conversas:</div>
                    <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {conversations.filter(c => c.contacts?.phone).map(conv => {
                        const checked = bRecipients.some(r => r.phone === conv.contacts.phone?.replace(/\D/g,""));
                        return (
                          <div key={conv.id} onClick={() => {
                            const phone = conv.contacts.phone?.replace(/\D/g,"");
                            const name = conv.contacts.name || "";
                            setBRecipients(prev => checked ? prev.filter(r => r.phone !== phone) : [...prev, { phone, name }]);
                          }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, cursor: "pointer", background: checked ? "#00c85310" : "transparent", border: `1px solid ${checked ? "#00c85333" : "transparent"}` }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? "#00c853" : "#333"}`, background: checked ? "#00c853" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{checked && <span style={{ color: "#000", fontSize: 10, fontWeight: 900 }}>✓</span>}</div>
                            <Avatar name={conv.contacts.name || conv.contacts.phone} size={20} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.contacts.name || conv.contacts.phone}</div>
                              <div style={{ fontSize: 10, color: "#555" }}>{conv.contacts.phone}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recipients preview */}
                <div style={{ padding: "10px 12px", background: "#13131f", borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: previewRecipients.length > 0 ? "#00c853" : "#555" }}>
                    {previewRecipients.length > 0 ? `✓ ${previewRecipients.length} destinatário${previewRecipients.length !== 1 ? "s" : ""} selecionado${previewRecipients.length !== 1 ? "s" : ""}` : "Nenhum destinatário selecionado"}
                  </div>
                  {previewRecipients.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#555", marginTop: 3 }}>• {r.name || r.phone}</div>
                  ))}
                  {previewRecipients.length > 3 && <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>... e mais {previewRecipients.length - 3}</div>}
                </div>

                <button
                  onClick={createBroadcast}
                  disabled={creating || !bName.trim() || !bMessage.trim() || previewRecipients.length === 0}
                  style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: (!creating && bName.trim() && bMessage.trim() && previewRecipients.length > 0) ? "linear-gradient(135deg,#00c853,#00796b)" : "#1a1a2e", color: (!creating && bName.trim() && bMessage.trim() && previewRecipients.length > 0) ? "#000" : "#444", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >{creating ? "Criando..." : bScheduledAt ? `📅 Agendar disparo` : `🚀 Iniciar disparo agora`}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── QUEUE ── */}
        {tab === "queue" && (
          <div style={{ maxWidth: 900 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Histórico de disparos</span>
              <button onClick={fetchBroadcasts} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Atualizar</button>
            </div>
            {loading ? <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Carregando...</div>
              : broadcasts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#444" }}>Nenhum disparo ainda</div>
                  <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Crie seu primeiro disparo na aba "Novo disparo"</div>
                </div>
              ) : broadcasts.map(b => {
                const pct = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;
                const color = STATUS_COLORS[b.status] || "#555";
                return (
                  <div key={b.id} style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.message}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                        <span style={{ background: color + "22", color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{STATUS_LABELS[b.status]}</span>
                        {(b.status === "pending" || b.status === "sending" || b.status === "scheduled") && (
                          <button onClick={() => cancelBroadcast(b.id)} style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #f4433344", background: "transparent", color: "#f44336", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🚫 Cancelar</button>
                        )}
                      </div>
                    </div>
                    <div style={{ background: "#13131f", borderRadius: 8, overflow: "hidden", height: 6, marginBottom: 8 }}>
                      <div style={{ height: "100%", background: `linear-gradient(90deg, ${color}, ${color}88)`, width: `${pct}%`, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#555" }}>
                      <span>📤 {b.sent_count}/{b.total_recipients} enviados</span>
                      {b.failed_count > 0 && <span style={{ color: "#f44336" }}>❌ {b.failed_count} falharam</span>}
                      <span>⏱ {b.interval_min}-{b.interval_max}s entre msgs</span>
                      {b.scheduled_at && <span>📅 {new Date(b.scheduled_at).toLocaleString("pt-BR")}</span>}
                      {b.finished_at && <span>✓ {new Date(b.finished_at).toLocaleString("pt-BR")}</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ── SCHEDULED ── */}
        {tab === "scheduled" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, maxWidth: 1000 }}>
            {/* List */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Mensagens agendadas</span>
                <button onClick={fetchScheduled} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻</button>
              </div>
              {scheduledMsgs.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                  <div style={{ fontSize: 14, color: "#444" }}>Nenhum agendamento ainda</div>
                </div>
              ) : scheduledMsgs.map(m => {
                const isPast = new Date(m.scheduled_at) < new Date();
                return (
                  <div key={m.id} style={{ background: "#0d0d18", border: `1px solid ${isPast && m.status === "pending" ? "#f4433633" : "#1a1a2e"}`, borderRadius: 10, padding: "13px 16px", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <Avatar name={m.contact_name || m.contact_phone} size={24} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{m.contact_name || m.contact_phone}</span>
                          <span style={{ fontSize: 11, color: "#555" }}>{m.contact_phone}</span>
                          {m.recurrence && <span style={{ fontSize: 10, background: "#7c4dff22", color: "#a78bfa", padding: "1px 7px", borderRadius: 10 }}>🔁 {RECURRENCE_LABELS[m.recurrence]}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 6, lineHeight: 1.5 }}>{m.message}</div>
                        <div style={{ fontSize: 11, color: isPast && m.status === "pending" ? "#f44336" : "#555" }}>
                          📅 {new Date(m.scheduled_at).toLocaleString("pt-BR")}
                          {isPast && m.status === "pending" && " — VENCIDA"}
                        </div>
                      </div>
                      <button onClick={() => deleteScheduled(m.id)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #33333344", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* New scheduled form */}
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, padding: 18, alignSelf: "flex-start" }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>+ Novo agendamento</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>CONVERSA (opcional)</label>
                  <select value={sConvId} onChange={e => {
                    setSConvId(e.target.value);
                    const conv = conversations.find(c => c.id === e.target.value);
                    if (conv) { setSPhone(conv.contacts?.phone || ""); setSName(conv.contacts?.name || ""); }
                  }} style={{ ...inputStyle }}>
                    <option value="">Selecione ou preencha manualmente...</option>
                    {conversations.map(c => <option key={c.id} value={c.id}>{c.contacts?.name || c.contacts?.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>TELEFONE *</label>
                  <input value={sPhone} onChange={e => setSPhone(e.target.value)} placeholder="5511999999999" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>NOME</label>
                  <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Nome do contato" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>MENSAGEM *</label>
                  <textarea value={sMessage} onChange={e => setSMessage(e.target.value)} rows={3} placeholder="Sua mensagem..." style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
                </div>
                <div>
                  <label style={labelStyle}>DATA E HORA *</label>
                  <input type="datetime-local" value={sDate} onChange={e => setSDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
                </div>
                <div>
                  <label style={labelStyle}>RECORRÊNCIA</label>
                  <select value={sRecurrence} onChange={e => setSRecurrence(e.target.value)} style={inputStyle}>
                    <option value="">Sem recorrência (envio único)</option>
                    <option value="daily">🔁 Diário</option>
                    <option value="weekly">🔁 Semanal</option>
                    <option value="monthly">🔁 Mensal</option>
                  </select>
                </div>
                <button onClick={createScheduled} disabled={creatingSched || !sPhone.trim() || !sMessage.trim() || !sDate} style={{ padding: "10px 0", borderRadius: 8, border: "none", background: (!creatingSched && sPhone.trim() && sMessage.trim() && sDate) ? "linear-gradient(135deg,#00c853,#00796b)" : "#1a1a2e", color: (!creatingSched && sPhone.trim() && sMessage.trim() && sDate) ? "#000" : "#444", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{creatingSched ? "Salvando..." : "📅 Agendar mensagem"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Global Tasks View ───────────────────────────────────────────────────────
function GlobalTasksView({ pendingTasksMap, conversations, agents, onSelectConv, onRefresh }) {
  const [tab, setTab] = useState("open"); // "open" | "done"
  const [openTasks, setOpenTasks] = useState([]);
  const [doneTasks, setDoneTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filterAgent, setFilterAgent] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);

  const fetchOpen = async () => {
    try {
      const r = await fetch(`${API_URL}/tasks?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      setOpenTasks((d.tasks || []).filter(t => !t.done));
    } catch (e) {}
  };
  const fetchDone = async () => {
    try {
      const r = await fetch(`${API_URL}/tasks/completed?tenant_id=${TENANT_ID}&days=7`, { headers });
      const d = await r.json();
      setDoneTasks(d.tasks || []);
    } catch (e) {}
  };
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchOpen(), fetchDone()]);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const completeTask = async (taskId) => {
    try { await fetch(`${API_URL}/tasks/${taskId}/done`, { method: "PUT", headers }); } catch (e) {}
    const done = openTasks.find(t => t.id === taskId);
    setOpenTasks(prev => prev.filter(t => t.id !== taskId));
    if (done) setDoneTasks(prev => [{ ...done, done: true, done_at: new Date().toISOString() }, ...prev]);
    setSelectedTask(null);
    if (onRefresh) onRefresh();
  };

  const getConv = (convId) => conversations.find(c => c.id === convId) || null;
  const isOverdue = (due) => due && new Date(due) < new Date();
  const overdueCount = openTasks.filter(t => isOverdue(t.due_at)).length;

  const filteredOpen = openTasks
    .filter(t => !filterAgent || t.assigned_to === filterAgent)
    .filter(t => !filterOverdue || isOverdue(t.due_at))
    .sort((a, b) => {
      const aOver = isOverdue(a.due_at) ? 0 : 1;
      const bOver = isOverdue(b.due_at) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      if (a.due_at && b.due_at) return new Date(a.due_at) - new Date(b.due_at);
      return 0;
    });

  const filteredDone = doneTasks
    .filter(t => !filterAgent || t.assigned_to === filterAgent);

  const renderCard = (task, isDone) => {
    const conv = getConv(task.conversation_id);
    const overdue = !isDone && isOverdue(task.due_at);
    const assignedName = task.users?.name || agents.find(a => a.id === task.assigned_to)?.name;
    const contactName = conv?.contacts?.name || conv?.contacts?.phone || task.conversations?.contacts?.name || task.conversations?.contacts?.phone;
    const contactPhone = conv?.contacts?.phone || task.conversations?.contacts?.phone;
    return (
      <div
        key={task.id}
        onClick={() => !isDone && setSelectedTask(task)}
        style={{ background: isDone ? "#0a0a0f" : "#0d0d18", border: `1px solid ${isDone ? "#1a1a2e" : overdue ? "#f4433633" : "#1a1a2e"}`, borderRadius: 12, padding: "14px 16px", cursor: isDone ? "default" : "pointer", transition: "all 0.15s", position: "relative", opacity: isDone ? 0.7 : 1 }}
        onMouseEnter={e => { if (!isDone) { e.currentTarget.style.borderColor = overdue ? "#f4433666" : "#252540"; e.currentTarget.style.background = "#13131f"; }}}
        onMouseLeave={e => { if (!isDone) { e.currentTarget.style.borderColor = overdue ? "#f4433633" : "#1a1a2e"; e.currentTarget.style.background = "#0d0d18"; }}}
      >
        {/* Status badge */}
        {isDone
          ? <div style={{ position: "absolute", top: 10, right: 12, background: "#00c85322", color: "#00c853", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>✓ CONCLUÍDA</div>
          : overdue && <div style={{ position: "absolute", top: 10, right: 12, background: "#f4433322", color: "#f44336", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>⚠ VENCIDA</div>
        }
        <div style={{ fontSize: 13, fontWeight: 700, color: isDone ? "#888" : "#e8e8f0", marginBottom: 6, paddingRight: 70, textDecoration: isDone ? "line-through" : "none" }}>{task.title}</div>
        {task.description && <div style={{ fontSize: 12, color: "#555", marginBottom: 10, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.description}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {isDone && task.done_at && <span style={{ fontSize: 11, color: "#00c853" }}>✓ {new Date(task.done_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
          {!isDone && task.due_at && <span style={{ fontSize: 11, color: overdue ? "#f44336" : "#888" }}>📅 {new Date(task.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
          {assignedName && <span style={{ fontSize: 11, color: isDone ? "#555" : "#00c853" }}>👤 {assignedName}</span>}
        </div>
        {(conv || contactName) && (
          <div
            onClick={e => { e.stopPropagation(); if (conv) onSelectConv(conv); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "#1a1a2e", borderRadius: 8, cursor: conv ? "pointer" : "default" }}
            onMouseEnter={e => { if (conv) e.currentTarget.style.background = "#252540"; }}
            onMouseLeave={e => { if (conv) e.currentTarget.style.background = "#1a1a2e"; }}
          >
            <Avatar name={contactName} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#ccc" }}>{contactName}</div>
              <div style={{ fontSize: 10, color: "#555" }}>{contactPhone}</div>
            </div>
            {conv && <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>→ ver conversa</span>}
          </div>
        )}
        {!isDone && <div style={{ marginTop: 8, fontSize: 10, color: "#444" }}>Clique para ver detalhes →</div>}
      </div>
    );
  };

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Sub-tabs */}
          <div style={{ display: "flex", gap: 4, background: "#0d0d18", borderRadius: 8, padding: 3, border: "1px solid #1a1a2e" }}>
            <button onClick={() => setTab("open")} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: tab === "open" ? "#1a1a2e" : "transparent", color: tab === "open" ? "#e8e8f0" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              ⏳ Em aberto
              {openTasks.length > 0 && <span style={{ background: overdueCount > 0 ? "#f44336" : "#00c853", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{openTasks.length}</span>}
            </button>
            <button onClick={() => { setTab("done"); fetchDone(); }} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: tab === "done" ? "#1a1a2e" : "transparent", color: tab === "done" ? "#e8e8f0" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              ✅ Concluídas
              {doneTasks.length > 0 && <span style={{ background: "#25254060", color: "#666", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10 }}>{doneTasks.length}</span>}
            </button>
          </div>
          {tab === "open" && overdueCount > 0 && <span style={{ background: "#f4433322", color: "#f44336", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>⚠ {overdueCount} vencida{overdueCount > 1 ? "s" : ""}</span>}
          {tab === "done" && <span style={{ fontSize: 11, color: "#555" }}>Últimos 7 dias</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {tab === "open" && <button onClick={() => setFilterOverdue(f => !f)} style={{ padding: "5px 12px", borderRadius: 7, border: `1px solid ${filterOverdue ? "#f4433344" : "#252540"}`, background: filterOverdue ? "#f4433315" : "transparent", color: filterOverdue ? "#f44336" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⚠ Vencidas</button>}
            <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)} style={{ padding: "5px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: filterAgent ? "#e8e8f0" : "#555", fontSize: 12, outline: "none", fontFamily: "inherit", cursor: "pointer" }}>
              <option value="">Todos os atendentes</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button onClick={fetchAll} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#555", padding: 40 }}>Carregando...</div>
          ) : tab === "open" ? (
            filteredOpen.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#444", marginBottom: 6 }}>Nenhuma tarefa pendente!</div>
                <div style={{ fontSize: 13, color: "#333" }}>Todas as tarefas foram concluídas.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {filteredOpen.map(t => renderCard(t, false))}
              </div>
            )
          ) : (
            filteredDone.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#444", marginBottom: 6 }}>Nenhuma tarefa concluída</div>
                <div style={{ fontSize: 13, color: "#333" }}>Nos últimos 7 dias ainda não há registros.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {filteredDone.map(t => renderCard(t, true))}
              </div>
            )
          )}
        </div>
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          agents={agents}
          onClose={() => setSelectedTask(null)}
          onComplete={completeTask}
        />
      )}
    </>
  );
}

function LeadsBoard({ conversations, kanbanCols, labels, onSelectConv, onManageLabels, onMoveLabel }) {
  const [dragging, setDragging] = useState(null);       // { convId, fromLabelId }
  const [dragOver, setDragOver] = useState(null);       // label.id or "unlabeled"

  const unlabeled = conversations.filter(c => !c.labels || c.labels.length === 0);

  const allLabelIds = new Set(labels.map(l => l.id));
  const extraLabels = [];
  conversations.forEach(conv => {
    (conv.labels || []).forEach(l => {
      if (!allLabelIds.has(l.id)) { allLabelIds.add(l.id); extraLabels.push(l); }
    });
  });
  const allLabels = [...labels, ...extraLabels];

  const handleDrop = (targetLabelId) => {
    if (!dragging) return;
    const conv = conversations.find(c => c.id === dragging.convId);
    if (conv) onMoveLabel(conv, dragging.fromLabelId, targetLabelId === "unlabeled" ? null : allLabels.find(l => l.id === targetLabelId));
    setDragging(null);
    setDragOver(null);
  };

  const renderCard = (conv, colLabel) => (
    <div
      key={conv.id}
      draggable
      onDragStart={(e) => { e.stopPropagation(); setDragging({ convId: conv.id, fromLabelId: colLabel?.id || null }); }}
      onDragEnd={() => { setDragging(null); setDragOver(null); }}
      onClick={() => !dragging && onSelectConv(conv)}
      style={{ background: "#13131f", border: `1px solid ${dragging?.convId === conv.id ? (colLabel?.color || "#555") + "55" : "#252540"}`, borderRadius: 10, padding: "11px 13px", cursor: "grab", opacity: dragging?.convId === conv.id ? 0.4 : 1, transition: "border-color 0.15s" }}
      onMouseEnter={e => { if (dragging?.convId !== conv.id) e.currentTarget.style.borderColor = (colLabel?.color || "#555") + "55"; }}
      onMouseLeave={e => { if (dragging?.convId !== conv.id) e.currentTarget.style.borderColor = "#252540"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Avatar name={conv.contacts?.name || conv.contacts?.phone} size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.contacts?.name || conv.contacts?.phone}</div>
          <div style={{ fontSize: 11, color: "#555" }}>{conv.contacts?.phone}</div>
        </div>
        <span style={{ fontSize: 10, color: "#555", flexShrink: 0 }}>{timeAgo(conv.last_message_at)}</span>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
        {(conv.labels || []).filter(l => l.id !== colLabel?.id).map(l => <LabelChip key={l.id} label={l} />)}
        <KanbanBadge stage={conv.kanban_stage} columns={kanbanCols} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <StatusDot status={conv.status} />
        <span style={{ fontSize: 10, color: "#555" }}>{conv.status === "open" ? "Aberto" : conv.status === "pending" ? "Pendente" : "Resolvido"}</span>
        {conv.assigned_agent && <span style={{ fontSize: 10, color: "#666", marginLeft: "auto" }}>👤 {conv.assigned_agent}</span>}
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>🏷 Leads por Etiqueta</span>
        <span style={{ fontSize: 12, color: "#555" }}>Arraste para mover entre etiquetas</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#555", background: "#1a1a2e", padding: "4px 12px", borderRadius: 20 }}>{conversations.length} total</span>
          <button onClick={onManageLabels} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⚙️ Gerenciar etiquetas</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 16, padding: "20px 24px", overflowX: "auto", overflowY: "hidden" }}>
        {allLabels.map(label => {
          const cards = conversations.filter(c => (c.labels || []).some(l => l.id === label.id));
          const isOver = dragOver === label.id;
          return (
            <div
              key={label.id}
              onDragOver={e => { e.preventDefault(); setDragOver(label.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(label.id)}
              style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", background: isOver ? "#1a1a2e" : "#0d0d18", border: `1px solid ${isOver ? label.color + "66" : "#1a1a2e"}`, borderRadius: 12, overflow: "hidden", transition: "all 0.15s" }}            >
              <div style={{ padding: "12px 14px", borderBottom: `2px solid ${label.color}44`, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: label.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: label.color, flex: 1 }}>{label.name}</span>
                <span style={{ background: label.color + "22", color: label.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{cards.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.length === 0
                  ? <div style={{ border: `2px dashed ${label.color}${isOver ? "88" : "22"}`, borderRadius: 8, padding: 20, textAlign: "center", color: isOver ? label.color : "#444", fontSize: 12, transition: "all 0.15s" }}>
                      {isOver ? "➕ Soltar aqui" : "Nenhum lead"}
                    </div>
                  : cards.map(conv => renderCard(conv, label))
                }
                {cards.length > 0 && isOver && (
                  <div style={{ border: `2px dashed ${label.color}88`, borderRadius: 8, padding: 12, textAlign: "center", color: label.color, fontSize: 12 }}>➕ Soltar aqui</div>
                )}
              </div>
            </div>
          );
        })}

        {/* Coluna sem etiqueta */}
        {(unlabeled.length > 0 || dragOver === "unlabeled") && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver("unlabeled"); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop("unlabeled")}
            style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", background: dragOver === "unlabeled" ? "#1a1a2e" : "#0d0d18", border: `1px solid ${dragOver === "unlabeled" ? "#55555566" : "#1a1a2e"}`, borderRadius: 12, overflow: "hidden", transition: "all 0.15s" }}
          >
            <div style={{ padding: "12px 14px", borderBottom: "2px solid #33333388", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#444", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: "#555", flex: 1 }}>Sem etiqueta</span>
              <span style={{ background: "#33333322", color: "#555", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{unlabeled.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              {unlabeled.length === 0
                ? <div style={{ border: "2px dashed #55555588", borderRadius: 8, padding: 20, textAlign: "center", color: "#666", fontSize: 12 }}>➕ Soltar aqui para remover etiqueta</div>
                : unlabeled.map(conv => renderCard(conv, null))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
function TaskDetailModal({ task, agents, onClose, onComplete }) {
  const [updates, setUpdates] = useState([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetchUpdates(); }, [task.id]);
  const fetchUpdates = async () => {
    try { const r = await fetch(`${API_URL}/tasks/${task.id}/updates`, { headers }); const d = await r.json(); setUpdates(d.updates || []); } catch (e) {}
    setLoading(false);
  };
  const sendUpdate = async () => {
    if (!newUpdate.trim() || sending) return;
    setSending(true);
    try { await fetch(`${API_URL}/tasks/${task.id}/updates`, { method: "POST", headers, body: JSON.stringify({ content: newUpdate.trim(), created_by: "Atendente" }) }); setNewUpdate(""); await fetchUpdates(); } catch (e) {}
    setSending(false);
  };
  const isOverdue = task.due_at && new Date(task.due_at) < new Date();
  const assignedName = task.users?.name || agents.find(a => a.id === task.assigned_to)?.name;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 16, width: 500, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px #00000080" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f0", marginBottom: 6 }}>{task.title}</div>
              {task.description && <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{task.description}</div>}
            </div>
            <span onClick={onClose} style={{ cursor: "pointer", color: "#555", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            {task.due_at && <span style={{ fontSize: 12, color: isOverdue ? "#f44336" : "#888", display: "flex", alignItems: "center", gap: 4 }}>📅 {new Date(task.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}{isOverdue && <span style={{ background: "#f4433322", color: "#f44336", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>VENCIDA</span>}</span>}
            {assignedName && <span style={{ fontSize: 12, color: "#00c853" }}>👤 {assignedName}</span>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 12 }}>ATUALIZAÇÕES</div>
          {loading ? <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 16 }}>Carregando...</div>
            : updates.length === 0 ? <div style={{ color: "#444", fontSize: 13, textAlign: "center", padding: 16 }}>Nenhuma atualização ainda.</div>
            : updates.map((u, i) => (
              <div key={u.id || i} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Avatar name={u.created_by || "?"} size={28} />
                  {i < updates.length - 1 && <div style={{ width: 2, flex: 1, background: "#1a1a2e", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0" }}>{u.created_by || "Atendente"}</span>
                    <span style={{ fontSize: 11, color: "#555" }}>{timeAgo(u.created_at)}</span>
                  </div>
                  <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>{u.content}</div>
                </div>
              </div>
            ))}
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 8 }}>NOVA ATUALIZAÇÃO</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <textarea value={newUpdate} onChange={e => setNewUpdate(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUpdate(); } }} placeholder="Descreva o que foi feito, próximos passos..." rows={2} style={{ flex: 1, padding: "9px 12px", background: "#0d0d18", border: "1px solid #252540", borderRadius: 9, color: "#e8e8f0", fontSize: 13, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
            <button onClick={sendUpdate} disabled={!newUpdate.trim() || sending} style={{ padding: "0 16px", borderRadius: 9, border: "none", background: newUpdate.trim() ? "linear-gradient(135deg, #00c853, #00796b)" : "#1a1a2e", color: newUpdate.trim() ? "#000" : "#444", fontSize: 13, fontWeight: 700, cursor: newUpdate.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0 }}>{sending ? "..." : "↑"}</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✕ Fechar</button>
            <button onClick={() => onComplete(task.id)} style={{ flex: 2, padding: "9px 0", borderRadius: 9, border: "1px solid #00c85344", background: "#00c85310", color: "#00c853", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✅ Marcar como concluída</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tasks Panel ──────────────────────────────────────────────────────────────
function TasksPanel({ convId, agents, onClose, onTaskDone }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const fetchTasks = async () => {
    try { const r = await fetch(`${API_URL}/tasks?tenant_id=${TENANT_ID}`, { headers }); const d = await r.json(); setTasks((d.tasks || []).filter(t => t.conversation_id === convId)); } catch (e) {}
    setLoading(false);
  };
  useEffect(() => { fetchTasks(); }, [convId]);
  const createTask = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try { await fetch(`${API_URL}/conversations/${convId}/tasks?tenant_id=${TENANT_ID}`, { method: "POST", headers, body: JSON.stringify({ title: title.trim(), description: description.trim() || null, assigned_to: assignedTo || null, due_at: dueAt || null }) }); setTitle(""); setDescription(""); setDueAt(""); setAssignedTo(""); await fetchTasks(); } catch (e) {}
    setCreating(false);
  };
  const completeTask = async (taskId) => {
    try { await fetch(`${API_URL}/tasks/${taskId}/done`, { method: "PUT", headers }); setTasks(prev => prev.filter(t => t.id !== taskId)); setSelectedTask(null); if (onTaskDone) onTaskDone(); } catch (e) {}
  };
  const isOverdue = (due) => due && new Date(due) < new Date();
  return (
    <>
      <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #1a1a2e", background: "#0d0d18", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>✅ Tarefas</span>
          <span style={{ background: "#00c85322", color: "#00c853", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{tasks.length}</span>
          <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: "#555", fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8 }}>NOVA TAREFA</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da tarefa *" style={{ width: "100%", padding: "8px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 6 }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)..." rows={2} style={{ width: "100%", padding: "8px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "none", marginBottom: 6, lineHeight: 1.5 }} />
          <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} style={{ width: "100%", padding: "7px 8px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: "#888", fontSize: 11, outline: "none", fontFamily: "inherit", colorScheme: "dark", boxSizing: "border-box", marginBottom: 6 }} />
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ width: "100%", padding: "7px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: assignedTo ? "#e8e8f0" : "#555", fontSize: 12, outline: "none", marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box" }}>
            <option value="">Responsável (opcional)</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={createTask} disabled={!title.trim() || creating} style={{ width: "100%", padding: "8px 0", borderRadius: 7, border: "none", background: title.trim() ? "linear-gradient(135deg, #00c853, #00796b)" : "#1a1a2e", color: title.trim() ? "#000" : "#444", fontSize: 12, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>{creating ? "Criando..." : "+ Criar tarefa"}</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
          {loading ? <div style={{ textAlign: "center", color: "#555", fontSize: 12, padding: 16 }}>Carregando...</div>
            : tasks.length === 0 ? <div style={{ textAlign: "center", padding: 24 }}><div style={{ fontSize: 28, marginBottom: 8 }}>📋</div><div style={{ fontSize: 12, color: "#555" }}>Nenhuma tarefa ainda</div></div>
            : tasks.map(task => (
              <div key={task.id} onClick={() => setSelectedTask(task)} style={{ background: "#13131f", border: `1px solid ${isOverdue(task.due_at) ? "#f4433644" : "#252540"}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#00c85344"} onMouseLeave={e => e.currentTarget.style.borderColor = isOverdue(task.due_at) ? "#f4433644" : "#252540"}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>{task.title}</div>
                {task.description && <div style={{ fontSize: 11, color: "#666", marginBottom: 6, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{task.description}</div>}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {task.due_at && <span style={{ fontSize: 10, color: isOverdue(task.due_at) ? "#f44336" : "#888" }}>📅 {new Date(task.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                  {task.users?.name && <span style={{ fontSize: 10, color: "#00c853" }}>👤 {task.users.name}</span>}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#444" }}>Clique para ver detalhes →</div>
              </div>
            ))}
        </div>
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} agents={agents} onClose={() => setSelectedTask(null)} onComplete={completeTask} />}
    </>
  );
}

// ─── Column Manager ───────────────────────────────────────────────────────────
function ColumnManagerModal({ columns, onChange, onClose }) {
  const [cols, setCols] = useState(columns.map(c => ({ ...c })));
  const [editingId, setEditingId] = useState(null);
  const [pickingColorFor, setPickingColorFor] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const update = (id, patch) => setCols(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  const addCol = () => { if (!newLabel.trim()) return; setCols(prev => [...prev, { id: uid(), label: newLabel.trim(), color: PALETTE[prev.length % PALETTE.length] }]); setNewLabel(""); };
  const save = () => { onChange(cols); saveColumns(cols); onClose(); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 14, padding: 24, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px #00000080" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>⚙️ Gerenciar Colunas</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Crie, renomeie ou delete colunas do Kanban</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {cols.map(col => (
            <div key={col.id} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d0d18", border: "1px solid #252540", borderRadius: 10, padding: "10px 14px" }}>
                <div onClick={() => setPickingColorFor(pickingColorFor === col.id ? null : col.id)} style={{ width: 22, height: 22, borderRadius: "50%", background: col.color, cursor: "pointer", flexShrink: 0, border: "2px solid #252540" }} />
                {editingId === col.id ? <input autoFocus value={col.label} onChange={e => update(col.id, { label: e.target.value })} onBlur={() => setEditingId(null)} onKeyDown={e => e.key === "Enter" && setEditingId(null)} style={{ flex: 1, background: "#1a1a2e", border: "1px solid #00c85344", borderRadius: 6, color: "#e8e8f0", fontSize: 13, padding: "4px 10px", outline: "none", fontFamily: "inherit" }} />
                  : <span onClick={() => setEditingId(col.id)} style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: "text", color: col.color }}>{col.label}</span>}
                <span onClick={() => setEditingId(col.id)} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }}>✏️</span>
                {cols.length > 1 && <span onClick={() => setCols(prev => prev.filter(c => c.id !== col.id))} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }}>🗑</span>}
              </div>
              {pickingColorFor === col.id && (
                <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 300, background: "#1a1a2e", border: "1px solid #252540", borderRadius: 10, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, width: 200, boxShadow: "0 8px 24px #00000060" }}>
                  {PALETTE.map(c => <div key={c} onClick={() => { update(col.id, { color: c }); setPickingColorFor(null); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: col.color === c ? "3px solid #fff" : "2px solid transparent" }} />)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8 }}>Nova coluna</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addCol()} placeholder="Nome da coluna..." style={{ flex: 1, padding: "8px 12px", background: "#0d0d18", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={addCol} disabled={!newLabel.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: newLabel.trim() ? "linear-gradient(135deg, #00c853, #00796b)" : "#1a1a2e", color: newLabel.trim() ? "#000" : "#444", fontSize: 13, fontWeight: 700, cursor: newLabel.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>+ Criar</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
          <button onClick={save} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #00c853, #00796b)", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>💾 Salvar colunas</button>
        </div>
      </div>
    </div>
  );
}

function AssignModal({ conversation, agents, onAssign, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 12, padding: 20, width: 300, boxShadow: "0 20px 60px #00000060" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Atribuir conversa</div>
        {agents.length === 0 ? <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: 12 }}>Nenhum atendente encontrado</div>
          : agents.map(agent => (
            <div key={agent.id} onClick={() => onAssign(agent)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.background = "#1a1a2e"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <Avatar name={agent.name} size={32} />
              <div><div style={{ fontSize: 13, fontWeight: 600 }}>{agent.name}</div><div style={{ fontSize: 11, color: "#666" }}>{agent.role === "admin" ? "Admin" : "Atendente"}</div></div>
              {conversation.assigned_to === agent.id && <span style={{ marginLeft: "auto", color: "#00c853", fontSize: 16 }}>✓</span>}
            </div>
          ))}
        <button onClick={onClose} style={{ marginTop: 12, width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancelar</button>
      </div>
    </div>
  );
}

function LabelPickerModal({ conversation, labels, onToggle, onClose, onManage }) {
  const convLabels = conversation.labels || [];
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 12, padding: 20, width: 280, boxShadow: "0 20px 60px #00000060" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Adicionar etiqueta</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {labels.map(label => {
            const active = convLabels.some(l => l.id === label.id);
            return <div key={label.id} onClick={() => onToggle(label)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${active ? label.color : "#252540"}`, background: active ? label.color + "11" : "transparent" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: label.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: active ? label.color : "#ccc", fontWeight: active ? 600 : 400 }}>{label.name}</span>
              {active && <span style={{ marginLeft: "auto", color: label.color }}>✓</span>}
            </div>;
          })}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onManage} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>⚙️ Gerenciar</button>
          <button onClick={onClose} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ conversations, columns, onMoveCard, onSelectConv, onManageCols }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const getStage = (conv) => columns.find(c => c.id === conv.kanban_stage) ? conv.kanban_stage : columns[0]?.id;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Kanban de Conversas</span>
        <span style={{ fontSize: 12, color: "#555" }}>Arraste para mover entre colunas</span>
        <button onClick={onManageCols} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>⚙️ Gerenciar colunas</button>
      </div>
      <div style={{ flex: 1, display: "flex", gap: 16, padding: "20px 24px", overflowX: "auto", overflowY: "hidden" }}>
        {columns.map(col => {
          const cards = conversations.filter(c => getStage(c) === col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id} onDragOver={e => { e.preventDefault(); setDragOver(col.id); }} onDragLeave={() => setDragOver(null)} onDrop={() => { if (dragging) { const conv = conversations.find(c => c.id === dragging); if (conv) onMoveCard(conv, col.id); } setDragging(null); setDragOver(null); }} style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", background: isOver ? "#1a1a2e" : "#0d0d18", border: `1px solid ${isOver ? col.color + "55" : "#1a1a2e"}`, borderRadius: 12, overflow: "hidden", transition: "all 0.15s" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: "#ccc", flex: 1 }}>{col.label}</span>
                <span style={{ background: col.color + "22", color: col.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{cards.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.length === 0 && <div style={{ border: `2px dashed ${col.color}22`, borderRadius: 8, padding: 20, textAlign: "center", color: "#444", fontSize: 12 }}>Arraste para cá</div>}
                {cards.map(conv => (
                  <div key={conv.id} draggable onDragStart={() => setDragging(conv.id)} onDragEnd={() => { setDragging(null); setDragOver(null); }} onClick={() => onSelectConv(conv)} style={{ background: "#13131f", border: `1px solid ${dragging === conv.id ? col.color + "55" : "#252540"}`, borderRadius: 10, padding: "11px 13px", cursor: "grab", opacity: dragging === conv.id ? 0.4 : 1 }} onMouseEnter={e => e.currentTarget.style.borderColor = col.color + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = "#252540"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Avatar name={conv.contacts?.name || conv.contacts?.phone} size={26} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.contacts?.name || conv.contacts?.phone}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{timeAgo(conv.last_message_at)}</div>
                      </div>
                      {conv.unread_count > 0 && <span style={{ background: col.color, color: "#000", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{conv.unread_count}</span>}
                    </div>
                    {conv.labels?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{conv.labels.map(l => <LabelChip key={l.id} label={l} />)}</div>}
                    {conv.assigned_agent && <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}><Avatar name={conv.assigned_agent} size={14} /><span style={{ fontSize: 10, color: "#555" }}>{conv.assigned_agent}</span></div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(getStoredAuth);

  const handleLogin = (data) => { setStoredAuth(data); setAuth(data); };
  const handleLogout = () => { setStoredAuth(null); setAuth(null); };

  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  return <AppInner auth={auth} onLogout={handleLogout} />;
}

function AppInner({ auth, onLogout }) {
  const [view, setView] = useState("inbox");
  const [trialInfo, setTrialInfo] = useState(null); // {status, days_left, is_blocked, plan}

  const fetchTrialStatus = async () => {
    try {
      const r = await fetch(`${API_URL}/tenant/trial-status?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      setTrialInfo(d);
    } catch (e) {}
  };

  useEffect(() => { fetchTrialStatus(); }, []);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState([]);
  const [pendingTasksMap, setPendingTasksMap] = useState({}); // convId → count
  const [labels, setLabels] = useState(loadLabels);
  const [showAssign, setShowAssign] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showColManager, setShowColManager] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [kanbanCols, setKanbanCols] = useState(loadColumns);
  const [suggestion, setSuggestion] = useState("");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/conversations?tenant_id=${TENANT_ID}&status=${filter}`, { headers }); const d = await r.json(); setConversations(d.conversations || []); } catch (e) {}
    setLoading(false);
  }, [filter]);
  const fetchAllConversations = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/conversations?tenant_id=${TENANT_ID}`, { headers }); const d = await r.json(); setConversations(d.conversations || []); } catch (e) {}
    setLoading(false);
  }, []);
  const fetchMessages = useCallback(async (convId) => {
    try { const r = await fetch(`${API_URL}/conversations/${convId}/messages`, { headers }); const d = await r.json(); setMessages(d.messages || []); } catch (e) {}
  }, []);
  const fetchAgents = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/users?tenant_id=${TENANT_ID}`, { headers }); const d = await r.json(); setAgents(d.users || []); } catch (e) {}
  }, []);
  const fetchTenant = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/tenant?tenant_id=${TENANT_ID}`, { headers }); const d = await r.json(); setCopilotPrompt(d.copilot_prompt || ""); } catch (e) {}
  }, []);
  const fetchPendingTasks = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/tasks?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      const map = {};
      (d.tasks || []).forEach(t => {
        if (!t.done) map[t.conversation_id] = (map[t.conversation_id] || 0) + 1;
      });
      setPendingTasksMap(map);
    } catch (e) {}
  }, []);
  const savePrompt = async () => {
    setSavingPrompt(true); setPromptSaved(false);
    try { await fetch(`${API_URL}/tenant/copilot-prompt`, { method: "PUT", headers, body: JSON.stringify({ tenant_id: TENANT_ID, copilot_prompt: copilotPrompt }) }); setPromptSaved(true); setTimeout(() => setPromptSaved(false), 3000); } catch (e) {}
    setSavingPrompt(false);
  };

  useEffect(() => {
    const isMulti = view === "kanban" || view === "leads";
    const fn = isMulti ? fetchAllConversations : fetchConversations;
    fn(); clearInterval(pollRef.current); pollRef.current = setInterval(fn, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchConversations, fetchAllConversations, view, filter]);
  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.id);
    const t = setInterval(() => fetchMessages(selected.id), 5000);
    return () => clearInterval(t);
  }, [selected, fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { fetchAgents(); fetchTenant(); fetchPendingTasks(); const t = setInterval(fetchPendingTasks, 30000); return () => clearInterval(t); }, [fetchAgents, fetchTenant, fetchPendingTasks]);

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try { await fetch(`${API_URL}/conversations/${selected.id}/messages`, { method: "POST", headers, body: JSON.stringify({ conversation_id: selected.id, text: input.trim(), is_internal_note: noteMode }) }); setInput(""); setNoteMode(false); await fetchMessages(selected.id); await fetchConversations(); } catch (e) {}
    setSending(false);
  };

  const changeStatus = async (convId, newStatus) => {
    const endpoint = newStatus === "resolved" ? "resolve" : newStatus === "pending" ? "pending" : "reopen";
    await fetch(`${API_URL}/conversations/${convId}/${endpoint}`, { method: "PUT", headers });
    setSelected(prev => prev ? { ...prev, status: newStatus } : null);
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, status: newStatus } : c));
    if (newStatus !== filter && filter !== "all") { setTimeout(() => { setSelected(null); fetchConversations(); }, 300); }
  };

  const assignConv = async (agent) => {
    try { await fetch(`${API_URL}/conversations/${selected.id}/assign`, { method: "PUT", headers, body: JSON.stringify({ user_id: agent.id }) }); const patch = { assigned_to: agent.id, assigned_agent: agent.name }; setSelected(prev => ({ ...prev, ...patch })); setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, ...patch } : c)); } catch (e) {}
    setShowAssign(false);
  };
  const toggleLabel = async (label) => {
    if (!selected) return;
    const current = selected.labels || []; const exists = current.some(l => l.id === label.id);
    const updated = exists ? current.filter(l => l.id !== label.id) : [...current, label];
    try { await fetch(`${API_URL}/conversations/${selected.id}/labels`, { method: "PUT", headers, body: JSON.stringify({ labels: updated }) }); } catch (e) {}
    setSelected(prev => ({ ...prev, labels: updated })); setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, labels: updated } : c));
  };
  const moveKanbanCard = async (conv, newStage) => {
    try { await fetch(`${API_URL}/conversations/${conv.id}/kanban`, { method: "PUT", headers, body: JSON.stringify({ stage: newStage }) }); } catch (e) {}
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, kanban_stage: newStage } : c));
  };

  const moveLabelCard = async (conv, fromLabelId, targetLabel) => {
    const current = conv.labels || [];
    let updated;
    if (!targetLabel) {
      // Soltar em "Sem etiqueta" → remove só a etiqueta de origem
      updated = current.filter(l => l.id !== fromLabelId);
    } else if (!fromLabelId) {
      // Veio de "Sem etiqueta" → apenas adiciona
      const alreadyHas = current.some(l => l.id === targetLabel.id);
      updated = alreadyHas ? current : [...current, targetLabel];
    } else {
      // SWAP: remove a de origem, adiciona a de destino
      const withoutFrom = current.filter(l => l.id !== fromLabelId);
      const alreadyHas = withoutFrom.some(l => l.id === targetLabel.id);
      updated = alreadyHas ? withoutFrom : [...withoutFrom, targetLabel];
    }
    try { await fetch(`${API_URL}/conversations/${conv.id}/labels`, { method: "PUT", headers, body: JSON.stringify({ labels: updated }) }); } catch (e) {}
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, labels: updated } : c));
  };
  const fetchSuggestion = async () => {
    if (!selected || loadingSuggest) return; setLoadingSuggest(true); setSuggestion("");
    try { const r = await fetch(`${API_URL}/conversations/${selected.id}/suggest`, { headers }); const d = await r.json(); setSuggestion(d.suggestion || ""); } catch (e) { setSuggestion("Erro ao buscar sugestão."); }
    setLoadingSuggest(false);
  };

  const filtered = conversations.filter(c => (c.contacts?.name || c.contacts?.phone || "").toLowerCase().includes(search.toLowerCase()));

  const totalPendingTasks = Object.values(pendingTasksMap).reduce((a, b) => a + b, 0);
  const TABS = [
    { id: "inbox", label: "📥 Inbox" },
    { id: "leads", label: "🏷 Leads" },
    { id: "kanban", label: "🗂 Kanban" },
    { id: "tasks_global", label: "✅ Tarefas" },
    { id: "disparos", label: "📢 Disparos" },
    { id: "config", label: "⚙️ Config" },
    ...(auth.user.role === "admin" ? [{ id: "admin", label: "🔐 Admin" }] : []),
    ...(auth.user.role === "admin" ? [{ id: "whatsapp", label: "📱 WhatsApp" }] : []),
    ...(trialInfo?.status === "trial" ? [{ id: "upgrade", label: "⭐ Assinar" }] : []),
    ...(auth.user.role === "admin" && trialInfo?.plan !== "trial" ? [{ id: "onboarding", label: "🧠 Onboarding IA" }] : []),
  ];

  // Blocked screen — trial expired
  if (trialInfo?.is_blocked) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", background: "#0a0a0f", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans','Segoe UI',sans-serif", flexDirection: "column", gap: 0 }}>
        <div style={{ width: 480, padding: "40px 36px", background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 20, boxShadow: "0 32px 80px #00000080", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#e8e8f0" }}>Seu trial de 7 dias encerrou</div>
          <div style={{ fontSize: 14, color: "#555", marginBottom: 32 }}>Escolha um plano para continuar usando o 7CRM. Seus dados estão seguros e serão mantidos.</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {[
              { plan: "starter", label: "Starter", price: "R$ 149/mês", desc: "1 número · 5 atendentes · Sem IA", color: "#00bcd4" },
              { plan: "pro", label: "Pro ⭐", price: "R$ 299/mês", desc: "3 números · 15 atendentes · Co-pilot IA + Onboarding", color: "#00c853", highlight: true },
              { plan: "business", label: "Business", price: "R$ 599/mês", desc: "8 números · 30 atendentes · IA · White-label", color: "#7c4dff" },
            ].map(p => (
              <div key={p.plan} onClick={async () => {
                await fetch(`${API_URL}/tenant/activate-plan`, { method: "POST", headers, body: JSON.stringify({ tenant_id: TENANT_ID, plan: p.plan }) });
                fetchTrialStatus();
              }} style={{ padding: "14px 20px", borderRadius: 12, border: `2px solid ${p.highlight ? p.color : "#1a1a2e"}`, background: p.highlight ? `${p.color}15` : "#13131f", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", transition: "all 0.2s" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.color, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{p.desc}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#e8e8f0", whiteSpace: "nowrap" }}>{p.price}</div>
                <span style={{ color: p.color, fontSize: 16 }}>→</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#333" }}>
            Para pagamento via PIX ou boleto, fale via WhatsApp · <span style={{ color: "#00c853" }}>Estúdio Se7e</span>
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a1a2e" }}>
            <button onClick={onLogout} style={{ background: "transparent", border: "none", color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sair da conta</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", flexDirection: "column", background: "#0a0a0f", color: "#e8e8f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflow: "hidden" }}>
      {/* TopBar */}
      <div style={{ height: 48, flexShrink: 0, borderBottom: "1px solid #1a1a2e", background: "#0d0d18", display: "flex", alignItems: "center", padding: "0 20px", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #00c853, #00796b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>7CRM</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 6, border: "none", background: view === tab.id ? "#00c85320" : "transparent", color: view === tab.id ? "#00c853" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tab.label}
              {tab.id === "tasks_global" && totalPendingTasks > 0 && <span style={{ background: "#ff6d00", color: "#000", fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 10, lineHeight: 1.4 }}>{totalPendingTasks}</span>}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Trial banner */}
          {trialInfo?.status === "trial" && trialInfo?.days_left !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: 20, background: trialInfo.days_left <= 2 ? "#f4433322" : "#ff6d0022", border: `1px solid ${trialInfo.days_left <= 2 ? "#f4433344" : "#ff6d0044"}` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: trialInfo.days_left <= 2 ? "#f44336" : "#ff6d00" }}>
                ⏰ Trial: {trialInfo.days_left === 0 ? "último dia!" : `${trialInfo.days_left} dia${trialInfo.days_left !== 1 ? "s" : ""} restante${trialInfo.days_left !== 1 ? "s" : ""}`}
              </span>
              <button onClick={() => setView("upgrade")} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: "none", background: trialInfo.days_left <= 2 ? "#f44336" : "#ff6d00", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Assinar</button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#444" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c853" }} />
            <span style={{ color: "#555" }}>{auth.user.name}</span>
          </div>
          <button onClick={onLogout} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #1a1a2e", background: "transparent", color: "#444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Sair</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Disparos */}
        {view === "disparos" && (
          <BroadcastsView
            conversations={conversations}
            labels={labels}
            agents={agents}
            kanbanCols={kanbanCols}
          />
        )}

        {/* Admin */}
        {view === "admin" && auth.user.role === "admin" && (
          <AdminPanel auth={auth} onLogout={onLogout} />
        )}

        {/* Onboarding IA */}
        {view === "onboarding" && auth.user.role === "admin" && (
          <OnboardingView auth={auth} />
        )}

        {/* WhatsApp Connection */}
        {view === "whatsapp" && auth.user.role === "admin" && (
          <WhatsAppScreen auth={auth} />
        )}

        {/* Upgrade */}
        {view === "upgrade" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 40 }}>
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🚀 Escolha seu plano</div>
                <div style={{ fontSize: 13, color: "#555" }}>Todos os planos incluem 7 dias de trial grátis para novos clientes</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { plan: "starter", label: "Starter", price: "R$ 149", desc: "Para recepções e pequenos negócios", color: "#00bcd4", features: ["1 número conectado", "Até 5 atendentes", "Inbox + Kanban + Etiquetas", "Disparos em massa", "Número extra: +R$49/mês"] },
                  { plan: "pro", label: "Pro", price: "R$ 299", desc: "Para academias, clínicas e empresas em crescimento", color: "#00c853", highlight: true, features: ["3 números conectados", "Até 15 atendentes", "Tudo do Starter", "Co-pilot IA (1.000 créditos/mês)", "Onboarding Inteligente IA (200 conversas)", "Número extra: +R$49/mês"] },
                  { plan: "business", label: "Business", price: "R$ 599", desc: "Para redes, franquias e operações maiores", color: "#7c4dff", features: ["8 números conectados", "Até 30 atendentes", "Tudo do Pro", "3.000 créditos IA/mês", "Onboarding Inteligente IA (500 conversas)", "White-label", "Suporte prioritário"] },
                ].map(p => (
                  <div key={p.plan} style={{ background: "#0d0d18", border: `2px solid ${p.highlight ? p.color : "#1a1a2e"}`, borderRadius: 14, padding: 24, position: "relative" }}>
                    {p.highlight && <div style={{ position: "absolute", top: -10, right: 20, background: "#00c853", color: "#000", fontSize: 10, fontWeight: 800, padding: "2px 12px", borderRadius: 20 }}>MAIS POPULAR</div>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: p.color }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{p.desc}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: "#e8e8f0" }}>{p.price}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>/mês</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                      {p.features.map(f => <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#888" }}><span style={{ color: p.color }}>✓</span>{f}</div>)}
                    </div>
                    <button onClick={async () => {
                      await fetch(`${API_URL}/tenant/activate-plan`, { method: "POST", headers, body: JSON.stringify({ tenant_id: TENANT_ID, plan: p.plan }) });
                      await fetchTrialStatus();
                      setView("inbox");
                    }} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", background: p.highlight ? `linear-gradient(135deg, ${p.color}, #00796b)` : `${p.color}22`, color: p.highlight ? "#000" : p.color, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      Assinar {p.label} →
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, padding: 16, background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 12, fontSize: 12, color: "#555", textAlign: "center" }}>
                💬 Pagamento via PIX, boleto ou cartão · Fale com a gente no WhatsApp para dúvidas
              </div>
            </div>
          </div>
        )}

        {/* Config */}
        {view === "config" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 40, maxWidth: 720 }}>
            <div style={{ marginBottom: 32 }}><div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>⚙️ Configurações</div><div style={{ fontSize: 13, color: "#555" }}>Personalize o comportamento do 7zap para sua empresa</div></div>
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 28, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontSize: 18 }}>✨</span><span style={{ fontSize: 16, fontWeight: 700 }}>Co-pilot IA</span><span style={{ background: "#7c4dff22", color: "#a78bfa", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>Claude (Anthropic)</span></div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>Defina o prompt do Co-pilot — tom de voz, produtos, regras e instruções do seu negócio.</div>
              <textarea value={copilotPrompt} onChange={e => setCopilotPrompt(e.target.value)} rows={10} placeholder="Você é um atendente da academia Estúdio Se7e..." style={{ width: "100%", padding: "14px 16px", background: "#13131f", border: "1px solid #252540", borderRadius: 10, color: "#e8e8f0", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", minHeight: 200 }} />
              <div style={{ fontSize: 11, color: "#444", marginTop: 6, marginBottom: 16 }}>{copilotPrompt.length} caracteres</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={savePrompt} disabled={savingPrompt} style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: savingPrompt ? "#1a1a2e" : "linear-gradient(135deg, #7c4dff, #5b21b6)", color: savingPrompt ? "#444" : "#fff", fontSize: 14, fontWeight: 700, cursor: savingPrompt ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{savingPrompt ? "Salvando..." : "💾 Salvar prompt"}</button>
                {promptSaved && <span style={{ fontSize: 13, color: "#00c853", fontWeight: 600 }}>✓ Salvo!</span>}
              </div>
            </div>
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏢 Sua Empresa</div>
              <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Informações do plano e uso atual</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Plano atual", value: "Pro", color: "#7c4dff" },
                  { label: "Versão", value: "7CRM v1.0", color: "#00c853" },
                  { label: "Atendentes", value: `${agents.length} ativo${agents.length !== 1 ? "s" : ""}`, color: "#00bcd4" },
                  { label: "Status", value: "🟢 Online", color: "#00c853" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#13131f", border: "1px solid #1a1a2e", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 14px", background: "#13131f", border: "1px solid #1a1a2e", borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>🔐</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 2 }}>Login e gestão de usuários</div>
                  <div style={{ fontSize: 11, color: "#444" }}>Em breve — autenticação por email/senha e painel de atendentes</div>
                </div>
                <span style={{ marginLeft: "auto", background: "#7c4dff22", color: "#a78bfa", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>EM BREVE</span>
              </div>
            </div>
          </div>
        )}

        {/* Global Tasks */}
        {view === "tasks_global" && (
          <GlobalTasksView
            pendingTasksMap={pendingTasksMap}
            conversations={conversations}
            agents={agents}
            onSelectConv={(conv) => { setSelected(conv); setView("inbox"); }}
            onRefresh={fetchPendingTasks}
          />
        )}

        {/* Leads */}
        {view === "leads" && (
          <LeadsBoard
            conversations={conversations}
            kanbanCols={kanbanCols}
            labels={labels}
            onSelectConv={(conv) => { setSelected(conv); setView("inbox"); }}
            onManageLabels={() => setShowLabelManager(true)}
            onMoveLabel={moveLabelCard}
          />
        )}

        {/* Kanban */}
        {view === "kanban" && <KanbanBoard conversations={conversations} columns={kanbanCols} onMoveCard={moveKanbanCard} onSelectConv={(conv) => { setSelected(conv); setView("inbox"); }} onManageCols={() => setShowColManager(true)} />}

        {/* Inbox */}
        {view === "inbox" && (
          <>
            {/* Sidebar */}
            <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #1a1a2e", background: "#0d0d18" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #1a1a2e" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.4 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa..." style={{ width: "100%", padding: "7px 12px 7px 30px", background: "#1a1a2e", border: "1px solid #252540", borderRadius: 8, color: "#e8e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", padding: "7px 10px", gap: 4, borderBottom: "1px solid #1a1a2e" }}>
                {["open","pending","resolved"].map(f => (
                  <button key={f} onClick={() => { setFilter(f); setSelected(null); }} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", background: filter === f ? "#00c85320" : "transparent", color: filter === f ? "#00c853" : "#666", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {f === "open" ? "Abertos" : f === "pending" ? "Pendentes" : "Resolvidos"}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>Carregando...</div>
                  : filtered.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>Nenhuma conversa</div>
                  : filtered.map(conv => (
                    <div key={conv.id} onClick={() => { setSelected(conv); setSuggestion(""); setShowTasks(false); setNoteMode(false); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", cursor: "pointer", background: selected?.id === conv.id ? "#1a1a2e" : "transparent", borderLeft: selected?.id === conv.id ? "3px solid #00c853" : "3px solid transparent" }}>
                      <Avatar name={conv.contacts?.name || conv.contacts?.phone} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.contacts?.name || conv.contacts?.phone}</span>
                          <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>{timeAgo(conv.last_message_at)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                          {conv.labels?.map(l => <LabelChip key={l.id} label={l} />)}
                          <KanbanBadge stage={conv.kanban_stage} columns={kanbanCols} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusDot status={conv.status} />
                          <span style={{ fontSize: 11, color: "#555", flex: 1 }}>{conv.assigned_agent ? `👤 ${conv.assigned_agent}` : conv.contacts?.phone}</span>
                          {conv.unread_count > 0 && <span style={{ background: "#00c853", color: "#000", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{conv.unread_count}</span>}
                          {pendingTasksMap[conv.id] > 0 && <span title={`${pendingTasksMap[conv.id]} tarefa(s) pendente(s)`} style={{ background: "#ff6d0022", border: "1px solid #ff6d0066", color: "#ff6d00", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10, flexShrink: 0 }}>✅ {pendingTasksMap[conv.id]}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div style={{ padding: "10px 14px", borderTop: "1px solid #1a1a2e", fontSize: 12, color: "#444", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c853" }} />{conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Chat area */}
            {selected ? (
              <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  {/* Chat header */}
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 10, background: "#0d0d18", flexWrap: "wrap" }}>
                    <Avatar name={selected.contacts?.name || selected.contacts?.phone} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{selected.contacts?.name || selected.contacts?.phone}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{selected.contacts?.phone}</span>
                        {selected.assigned_agent && <span style={{ fontSize: 11, color: "#00c853" }}>· 👤 {selected.assigned_agent}</span>}
                        {selected.labels?.map(l => <LabelChip key={l.id} label={l} />)}
                        <KanbanBadge stage={selected.kanban_stage} columns={kanbanCols} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      <button onClick={() => setShowLabelPicker(true)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>🏷 Etiqueta</button>
                      <button onClick={() => setShowAssign(true)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>👤 Atribuir</button>
                      <button onClick={fetchSuggestion} disabled={loadingSuggest} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #7c4dff44", background: loadingSuggest ? "#1a1a2e" : "#7c4dff15", color: loadingSuggest ? "#444" : "#a78bfa", fontSize: 11, cursor: loadingSuggest ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>{loadingSuggest ? "⏳..." : "✨ Co-pilot"}</button>
                      <button onClick={() => setShowTasks(t => !t)} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, border: `1px solid ${showTasks ? "#00c85344" : pendingTasksMap[selected?.id] > 0 ? "#ff6d0044" : "#252540"}`, background: showTasks ? "#00c85315" : pendingTasksMap[selected?.id] > 0 ? "#ff6d0010" : "transparent", color: showTasks ? "#00c853" : pendingTasksMap[selected?.id] > 0 ? "#ff6d00" : "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✅ Tarefas{!showTasks && pendingTasksMap[selected?.id] > 0 && <span style={{ background: "#ff6d00", color: "#000", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 10 }}>{pendingTasksMap[selected.id]}</span>}</button>
                      {/* Status Dropdown */}
                      <StatusDropdown status={selected.status} onChange={(newStatus) => changeStatus(selected.id, newStatus)} />
                    </div>
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {messages.length === 0 ? <div style={{ textAlign: "center", color: "#444", fontSize: 13, marginTop: 40 }}>Nenhuma mensagem ainda</div>
                      : messages.map((msg, i) => {
                        const isOut = msg.direction === "outbound";
                        const isInternal = msg.is_internal_note;
                        return (
                          <div key={msg.id || i} style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start", marginBottom: 2 }}>
                            <div style={{ maxWidth: "65%", padding: "10px 14px", borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: isInternal ? "#2a2010" : isOut ? "#00c85322" : "#1a1a2e", border: isInternal ? "1px solid #ffd60044" : isOut ? "1px solid #00c85340" : "1px solid #252540", fontSize: 14, lineHeight: 1.5, color: isInternal ? "#ffd600" : isOut ? "#b0f0c0" : "#e8e8f0" }}>
                              {isInternal && <div style={{ fontSize: 10, fontWeight: 700, color: "#ffd600", marginBottom: 4 }}>📝 NOTA INTERNA</div>}
                              <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                              <div style={{ fontSize: 10, color: "#555", marginTop: 4, textAlign: isOut ? "right" : "left" }}>{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #1a1a2e", background: "#0d0d18" }}>
                    {suggestion && (
                      <div style={{ marginBottom: 10, padding: "12px 14px", background: "#1a1030", border: "1px solid #7c4dff44", borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span>✨</span><span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>SUGESTÃO DO CO-PILOT</span>
                          <span onClick={() => setSuggestion("")} style={{ marginLeft: "auto", fontSize: 16, cursor: "pointer", color: "#555" }}>×</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.5, marginBottom: 10 }}>{suggestion}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setInput(suggestion); setSuggestion(""); }} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "linear-gradient(135deg, #7c4dff, #5b21b6)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Usar resposta</button>
                          <button onClick={fetchSuggestion} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #7c4dff44", background: "transparent", color: "#a78bfa", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻ Nova</button>
                          <button onClick={() => setSuggestion("")} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #252540", background: "transparent", color: "#555", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Ignorar</button>
                        </div>
                      </div>
                    )}
                    {noteMode && (
                      <div style={{ marginBottom: 8, padding: "6px 12px", background: "#ffd60011", border: "1px solid #ffd60033", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12 }}>📝</span>
                        <span style={{ fontSize: 12, color: "#ffd600", fontWeight: 600 }}>Modo nota interna — visível só para a equipe</span>
                        <span onClick={() => setNoteMode(false)} style={{ marginLeft: "auto", cursor: "pointer", color: "#ffd600", fontSize: 14, opacity: 0.7 }}>×</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <button onClick={() => setNoteMode(n => !n)} style={{ padding: "9px 10px", borderRadius: 9, border: `1px solid ${noteMode ? "#ffd60044" : "#252540"}`, background: noteMode ? "#ffd60015" : "transparent", color: noteMode ? "#ffd600" : "#555", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>📝</button>
                      <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={noteMode ? "Escreva uma nota interna..." : "Digite uma mensagem... (Enter para enviar)"} rows={1} style={{ flex: 1, padding: "9px 13px", background: noteMode ? "#1a1500" : "#1a1a2e", border: `1px solid ${noteMode ? "#ffd60033" : "#252540"}`, borderRadius: 9, color: noteMode ? "#ffd600" : "#e8e8f0", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
                      <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: sending || !input.trim() ? "#1a1a2e" : noteMode ? "linear-gradient(135deg, #ffd600, #f57f17)" : "linear-gradient(135deg, #00c853, #00796b)", color: sending || !input.trim() ? "#444" : "#000", fontSize: 14, fontWeight: 700, cursor: sending || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}>{sending ? "..." : noteMode ? "Nota" : "Enviar"}</button>
                    </div>
                  </div>
                </div>
                {showTasks && <TasksPanel convId={selected.id} agents={agents} onClose={() => { setShowTasks(false); fetchPendingTasks(); }} onTaskDone={fetchPendingTasks} />}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "#333" }}>
                <div style={{ fontSize: 44 }}>💬</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: "#444" }}>Selecione uma conversa</div>
                <div style={{ fontSize: 13, color: "#333" }}>Escolha uma conversa na lista ao lado</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAssign && selected && <AssignModal conversation={selected} agents={agents} onAssign={assignConv} onClose={() => setShowAssign(false)} />}
      {showLabelPicker && selected && (
        <LabelPickerModal
          conversation={selected}
          labels={labels}
          onToggle={toggleLabel}
          onClose={() => setShowLabelPicker(false)}
          onManage={() => { setShowLabelPicker(false); setShowLabelManager(true); }}
        />
      )}
      {showLabelManager && (
        <LabelManagerModal
          labels={labels}
          onChange={(newLabels) => setLabels(newLabels)}
          onClose={() => setShowLabelManager(false)}
        />
      )}
      {showColManager && <ColumnManagerModal columns={kanbanCols} onChange={setKanbanCols} onClose={() => setShowColManager(false)} />}
    </div>
  );
}
