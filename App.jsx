import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = "https://7zap-inbox-production.up.railway.app";
const API_KEY = "7zap_inbox_secret";
const TENANT_ID = "98c38c97-2796-471f-bfc9-f093ff3ae6e9";

const headers = { "x-api-key": API_KEY, "Content-Type": "application/json" };

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
const DEFAULT_LABELS = [
  { id: "lead", name: "Lead quente", color: "#00c853" },
  { id: "doubt", name: "Dúvida", color: "#00bcd4" },
  { id: "complaint", name: "Reclamação", color: "#f44336" },
  { id: "renewal", name: "Renovação", color: "#ff6d00" },
  { id: "financial", name: "Financeiro", color: "#7c4dff" },
];
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

// ─── Tasks Panel ──────────────────────────────────────────────────────────────
function TasksPanel({ convId, agents, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTasks = async () => {
    try {
      const r = await fetch(`${API_URL}/tasks?tenant_id=${TENANT_ID}`, { headers });
      const d = await r.json();
      setTasks((d.tasks || []).filter(t => t.conversation_id === convId));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [convId]);

  const createTask = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      await fetch(`${API_URL}/conversations/${convId}/tasks?tenant_id=${TENANT_ID}`, {
        method: "POST", headers,
        body: JSON.stringify({ title: title.trim(), assigned_to: assignedTo || null, due_at: dueAt || null }),
      });
      setTitle(""); setDueAt(""); setAssignedTo("");
      await fetchTasks();
    } catch (e) {}
    setCreating(false);
  };

  const completeTask = async (taskId) => {
    try {
      await fetch(`${API_URL}/tasks/${taskId}/done`, { method: "PUT", headers });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {}
  };

  const isOverdue = (due) => due && new Date(due) < new Date();

  return (
    <div style={{ width: 300, flexShrink: 0, borderLeft: "1px solid #1a1a2e", background: "#0d0d18", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>✅ Tarefas</span>
        <span style={{ background: "#00c85322", color: "#00c853", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20 }}>{tasks.length}</span>
        <span onClick={onClose} style={{ marginLeft: "auto", cursor: "pointer", color: "#555", fontSize: 18, lineHeight: 1 }}>×</span>
      </div>

      {/* New task form */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1a1a2e" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 8 }}>NOVA TAREFA</div>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createTask()}
          placeholder="Título da tarefa..."
          style={{ width: "100%", padding: "8px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: "#e8e8f0", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
            style={{ flex: 1, padding: "7px 8px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: "#888", fontSize: 11, outline: "none", fontFamily: "inherit", colorScheme: "dark" }}
          />
        </div>
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
          style={{ width: "100%", padding: "7px 10px", background: "#13131f", border: "1px solid #252540", borderRadius: 7, color: assignedTo ? "#e8e8f0" : "#555", fontSize: 12, outline: "none", marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box" }}>
          <option value="">Responsável (opcional)</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={createTask} disabled={!title.trim() || creating} style={{ width: "100%", padding: "8px 0", borderRadius: 7, border: "none", background: title.trim() ? "linear-gradient(135deg, #00c853, #00796b)" : "#1a1a2e", color: title.trim() ? "#000" : "#444", fontSize: 12, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
          {creating ? "Criando..." : "+ Criar tarefa"}
        </button>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {loading ? <div style={{ textAlign: "center", color: "#555", fontSize: 12, padding: 16 }}>Carregando...</div>
          : tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 12, color: "#555" }}>Nenhuma tarefa ainda</div>
            </div>
          ) : tasks.map(task => (
            <div key={task.id} style={{ background: "#13131f", border: `1px solid ${isOverdue(task.due_at) ? "#f4433644" : "#252540"}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div onClick={() => completeTask(task.id)} style={{ width: 16, height: 16, borderRadius: 4, border: "2px solid #00c853", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#00c85333"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0", marginBottom: 4 }}>{task.title}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {task.due_at && (
                      <span style={{ fontSize: 10, color: isOverdue(task.due_at) ? "#f44336" : "#888" }}>
                        📅 {new Date(task.due_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {task.users?.name && <span style={{ fontSize: 10, color: "#00c853" }}>👤 {task.users.name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Column Manager Modal ─────────────────────────────────────────────────────
function ColumnManagerModal({ columns, onChange, onClose }) {
  const [cols, setCols] = useState(columns.map(c => ({ ...c })));
  const [editingId, setEditingId] = useState(null);
  const [pickingColorFor, setPickingColorFor] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const update = (id, patch) => setCols(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  const remove = (id) => setCols(prev => prev.filter(c => c.id !== id));
  const addCol = () => { if (!newLabel.trim()) return; setCols(prev => [...prev, { id: uid(), label: newLabel.trim(), color: PALETTE[prev.length % PALETTE.length] }]); setNewLabel(""); };
  const save = () => { onChange(cols); saveColumns(cols); onClose(); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000090", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 14, padding: 24, width: 420, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px #00000080" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>⚙️ Gerenciar Colunas</div>
        <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>Crie, renomeie, recolora ou delete colunas do Kanban</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {cols.map((col) => (
            <div key={col.id} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0d0d18", border: "1px solid #252540", borderRadius: 10, padding: "10px 14px" }}>
                <div onClick={() => setPickingColorFor(pickingColorFor === col.id ? null : col.id)} style={{ width: 22, height: 22, borderRadius: "50%", background: col.color, cursor: "pointer", flexShrink: 0, border: "2px solid #252540", transition: "transform 0.15s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.2)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                {editingId === col.id ? (
                  <input autoFocus value={col.label} onChange={e => update(col.id, { label: e.target.value })} onBlur={() => setEditingId(null)} onKeyDown={e => e.key === "Enter" && setEditingId(null)} style={{ flex: 1, background: "#1a1a2e", border: "1px solid #00c85344", borderRadius: 6, color: "#e8e8f0", fontSize: 13, padding: "4px 10px", outline: "none", fontFamily: "inherit" }} />
                ) : (
                  <span onClick={() => setEditingId(col.id)} style={{ flex: 1, fontSize: 13, fontWeight: 600, cursor: "text", color: col.color }}>{col.label}</span>
                )}
                <span onClick={() => setEditingId(col.id)} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>✏️</span>
                {cols.length > 1 && <span onClick={() => remove(col.id)} style={{ fontSize: 14, cursor: "pointer", opacity: 0.4 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"}>🗑</span>}
              </div>
              {pickingColorFor === col.id && (
                <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 300, background: "#1a1a2e", border: "1px solid #252540", borderRadius: 10, padding: 12, display: "flex", flexWrap: "wrap", gap: 8, width: 200, boxShadow: "0 8px 24px #00000060" }}>
                  {PALETTE.map(c => <div key={c} onClick={() => { update(col.id, { color: c }); setPickingColorFor(null); }} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: col.color === c ? "3px solid #fff" : "2px solid transparent" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />)}
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
            <div key={agent.id} onClick={() => onAssign(agent)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: conversation.assigned_to === agent.id ? "#1a1a2e" : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = "#1a1a2e"} onMouseLeave={e => e.currentTarget.style.background = conversation.assigned_to === agent.id ? "#1a1a2e" : "transparent"}>
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

function LabelModal({ conversation, onToggle, onClose }) {
  const convLabels = conversation.labels || [];
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 12, padding: 20, width: 280, boxShadow: "0 20px 60px #00000060" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Adicionar etiqueta</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {DEFAULT_LABELS.map(label => {
            const active = convLabels.some(l => l.id === label.id);
            return <div key={label.id} onClick={() => onToggle(label)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${active ? label.color : "#252540"}`, background: active ? label.color + "11" : "transparent" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: label.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: active ? label.color : "#ccc", fontWeight: active ? 600 : 400 }}>{label.name}</span>
              {active && <span style={{ marginLeft: "auto", color: label.color }}>✓</span>}
            </div>;
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 8, border: "1px solid #252540", background: "transparent", color: "#666", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fechar</button>
      </div>
    </div>
  );
}

function KanbanBoard({ conversations, columns, onMoveCard, onSelectConv, onManageCols }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const getStage = (conv) => { const found = columns.find(c => c.id === conv.kanban_stage); return found ? conv.kanban_stage : columns[0]?.id; };
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
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: "#ccc", flex: 1 }}>{col.label}</span>
                <span style={{ background: col.color + "22", color: col.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{cards.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.length === 0 && <div style={{ border: `2px dashed ${col.color}22`, borderRadius: 8, padding: 20, textAlign: "center", color: "#444", fontSize: 12 }}>Arraste para cá</div>}
                {cards.map(conv => (
                  <div key={conv.id} draggable onDragStart={() => setDragging(conv.id)} onDragEnd={() => { setDragging(null); setDragOver(null); }} onClick={() => onSelectConv(conv)} style={{ background: "#13131f", border: `1px solid ${dragging === conv.id ? col.color + "55" : "#252540"}`, borderRadius: 10, padding: "11px 13px", cursor: "grab", opacity: dragging === conv.id ? 0.4 : 1, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = col.color + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = "#252540"}>
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
  const [view, setView] = useState("inbox");
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState([]);
  const [showAssign, setShowAssign] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
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
  const savePrompt = async () => {
    setSavingPrompt(true); setPromptSaved(false);
    try { await fetch(`${API_URL}/tenant/copilot-prompt`, { method: "PUT", headers, body: JSON.stringify({ tenant_id: TENANT_ID, copilot_prompt: copilotPrompt }) }); setPromptSaved(true); setTimeout(() => setPromptSaved(false), 3000); } catch (e) {}
    setSavingPrompt(false);
  };

  useEffect(() => {
    const fn = view === "kanban" ? fetchAllConversations : fetchConversations;
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
  useEffect(() => { fetchAgents(); fetchTenant(); }, [fetchAgents, fetchTenant]);

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/conversations/${selected.id}/messages`, {
        method: "POST", headers,
        body: JSON.stringify({ conversation_id: selected.id, text: input.trim(), is_internal_note: noteMode }),
      });
      setInput(""); setNoteMode(false);
      await fetchMessages(selected.id); await fetchConversations();
    } catch (e) {}
    setSending(false);
  };
  const resolveConv = async (convId) => { await fetch(`${API_URL}/conversations/${convId}/resolve`, { method: "PUT", headers }); setSelected(null); fetchConversations(); };
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
  const fetchSuggestion = async () => {
    if (!selected || loadingSuggest) return; setLoadingSuggest(true); setSuggestion("");
    try { const r = await fetch(`${API_URL}/conversations/${selected.id}/suggest`, { headers }); const d = await r.json(); setSuggestion(d.suggestion || ""); } catch (e) { setSuggestion("Erro ao buscar sugestão."); }
    setLoadingSuggest(false);
  };

  const filtered = conversations.filter(c => (c.contacts?.name || c.contacts?.phone || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", flexDirection: "column", background: "#0a0a0f", color: "#e8e8f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflow: "hidden" }}>
      {/* Nav */}
      <div style={{ height: 48, flexShrink: 0, borderBottom: "1px solid #1a1a2e", background: "#0d0d18", display: "flex", alignItems: "center", padding: "0 20px", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #00c853, #00796b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>7zap</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ id: "inbox", label: "📥 Inbox" }, { id: "kanban", label: "🗂 Kanban" }, { id: "config", label: "⚙️ Config" }].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: view === tab.id ? "#00c85320" : "transparent", color: view === tab.id ? "#00c853" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{tab.label}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#444" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00c853" }} />Estúdio Se7e
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* CONFIG */}
        {view === "config" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 40, maxWidth: 720 }}>
            <div style={{ marginBottom: 32 }}><div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>⚙️ Configurações</div><div style={{ fontSize: 13, color: "#555" }}>Personalize o comportamento do 7zap para sua empresa</div></div>
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 28, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontSize: 18 }}>✨</span><span style={{ fontSize: 16, fontWeight: 700 }}>Co-pilot IA</span><span style={{ background: "#7c4dff22", color: "#a78bfa", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>Claude (Anthropic)</span></div>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 20 }}>Defina o prompt do Co-pilot — tom de voz, produtos, regras e instruções do seu negócio.</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8 }}>Prompt do atendente</div>
                <textarea value={copilotPrompt} onChange={e => setCopilotPrompt(e.target.value)} rows={10} placeholder={"Exemplo:\nVocê é um atendente da academia Estúdio Se7e...\n\nNossos planos:\n- Mensal: R$99/mês\n\nRegras:\n- Sempre use linguagem informal e simpática"} style={{ width: "100%", padding: "14px 16px", background: "#13131f", border: "1px solid #252540", borderRadius: 10, color: "#e8e8f0", fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, boxSizing: "border-box", minHeight: 200 }} onFocus={e => e.target.style.borderColor = "#7c4dff44"} onBlur={e => e.target.style.borderColor = "#252540"} />
                <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{copilotPrompt.length} caracteres · Salvo no banco de dados por tenant</div>
              </div>
              <div style={{ background: "#13131f", border: "1px solid #252540", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 8 }}>💡 Dicas para um bom prompt</div>
                {["Descreva o tipo de negócio e localização","Liste os produtos/planos com preços","Defina o tom de voz (formal, informal, amigável)","Adicione regras específicas (ex: não dar desconto)","Mencione perguntas frequentes dos clientes"].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4 }}><span style={{ color: "#7c4dff" }}>•</span><span style={{ fontSize: 12, color: "#666" }}>{tip}</span></div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={savePrompt} disabled={savingPrompt} style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: savingPrompt ? "#1a1a2e" : "linear-gradient(135deg, #7c4dff, #5b21b6)", color: savingPrompt ? "#444" : "#fff", fontSize: 14, fontWeight: 700, cursor: savingPrompt ? "not-allowed" : "pointer", fontFamily: "inherit" }}>{savingPrompt ? "Salvando..." : "💾 Salvar prompt"}</button>
                {promptSaved && <span style={{ fontSize: 13, color: "#00c853", fontWeight: 600 }}>✓ Salvo com sucesso!</span>}
              </div>
            </div>
            <div style={{ background: "#0d0d18", border: "1px solid #1a1a2e", borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📋 Informações do Tenant</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[["Tenant ID", TENANT_ID],["API URL", API_URL],["Versão", "7zap Inbox v1.0"]].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", gap: 12 }}><span style={{ fontSize: 12, color: "#555", width: 100, flexShrink: 0 }}>{label}</span><span style={{ fontSize: 12, color: "#888", fontFamily: "monospace", wordBreak: "break-all" }}>{value}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KANBAN */}
        {view === "kanban" && <KanbanBoard conversations={conversations} columns={kanbanCols} onMoveCard={moveKanbanCard} onSelectConv={(conv) => { setSelected(conv); setView("inbox"); }} onManageCols={() => setShowColManager(true)} />}

        {/* INBOX */}
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
                  : filtered.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>Nenhuma conversa {filter === "open" ? "aberta" : filter === "pending" ? "pendente" : "resolvida"}</div>
                  : filtered.map(conv => (
                    <div key={conv.id} onClick={() => { setSelected(conv); setSuggestion(""); setShowTasks(false); setNoteMode(false); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", cursor: "pointer", background: selected?.id === conv.id ? "#1a1a2e" : "transparent", borderLeft: selected?.id === conv.id ? "3px solid #00c853" : "3px solid transparent", transition: "all 0.15s" }}>
                      <Avatar name={conv.contacts?.name || conv.contacts?.phone} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.contacts?.name || conv.contacts?.phone}</span>
                          <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>{timeAgo(conv.last_message_at)}</span>
                        </div>
                        {conv.labels?.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>{conv.labels.map(l => <LabelChip key={l.id} label={l} />)}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusDot status={conv.status} />
                          <span style={{ fontSize: 11, color: "#555", flex: 1 }}>{conv.assigned_agent ? `👤 ${conv.assigned_agent}` : conv.contacts?.phone}</span>
                          {conv.unread_count > 0 && <span style={{ background: "#00c853", color: "#000", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 10, flexShrink: 0 }}>{conv.unread_count}</span>}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{selected.contacts?.phone}</span>
                        {selected.assigned_agent && <span style={{ fontSize: 11, color: "#00c853" }}>· 👤 {selected.assigned_agent}</span>}
                        {selected.labels?.map(l => <LabelChip key={l.id} label={l} />)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      <button onClick={() => setShowLabel(true)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>🏷 Etiqueta</button>
                      <button onClick={() => setShowAssign(true)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>👤 Atribuir</button>
                      <button onClick={fetchSuggestion} disabled={loadingSuggest} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #7c4dff44", background: loadingSuggest ? "#1a1a2e" : "#7c4dff15", color: loadingSuggest ? "#444" : "#a78bfa", fontSize: 11, cursor: loadingSuggest ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}>{loadingSuggest ? "⏳..." : "✨ Co-pilot"}</button>
                      <button onClick={() => setShowTasks(t => !t)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${showTasks ? "#00c85344" : "#252540"}`, background: showTasks ? "#00c85315" : "transparent", color: showTasks ? "#00c853" : "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✅ Tarefas</button>
                      <button onClick={() => resolveConv(selected.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #252540", background: "transparent", color: "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✓ Resolver</button>
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
                              {isInternal && <div style={{ fontSize: 10, fontWeight: 700, color: "#ffd600", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>📝 NOTA INTERNA</div>}
                              <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                              <div style={{ fontSize: 10, color: "#555", marginTop: 4, textAlign: isOut ? "right" : "left" }}>{new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input area */}
                  <div style={{ padding: "10px 14px", borderTop: "1px solid #1a1a2e", background: "#0d0d18" }}>
                    {/* Co-pilot suggestion */}
                    {suggestion && (
                      <div style={{ marginBottom: 10, padding: "12px 14px", background: "#1a1030", border: "1px solid #7c4dff44", borderRadius: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <span style={{ fontSize: 13 }}>✨</span><span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>SUGESTÃO DO CO-PILOT</span>
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

                    {/* Note mode banner */}
                    {noteMode && (
                      <div style={{ marginBottom: 8, padding: "6px 12px", background: "#ffd60011", border: "1px solid #ffd60033", borderRadius: 7, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12 }}>📝</span>
                        <span style={{ fontSize: 12, color: "#ffd600", fontWeight: 600 }}>Modo nota interna — visível só para a equipe</span>
                        <span onClick={() => setNoteMode(false)} style={{ marginLeft: "auto", cursor: "pointer", color: "#ffd600", fontSize: 14, opacity: 0.7 }}>×</span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      {/* Note toggle button */}
                      <button
                        onClick={() => setNoteMode(n => !n)}
                        title="Nota interna (visível só para equipe)"
                        style={{ padding: "9px 10px", borderRadius: 9, border: `1px solid ${noteMode ? "#ffd60044" : "#252540"}`, background: noteMode ? "#ffd60015" : "transparent", color: noteMode ? "#ffd600" : "#555", fontSize: 14, cursor: "pointer", flexShrink: 0 }}>
                        📝
                      </button>
                      <textarea value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder={noteMode ? "Escreva uma nota interna... (visível só para a equipe)" : "Digite uma mensagem... (Enter para enviar)"}
                        rows={1}
                        style={{ flex: 1, padding: "9px 13px", background: noteMode ? "#1a1500" : "#1a1a2e", border: `1px solid ${noteMode ? "#ffd60033" : "#252540"}`, borderRadius: 9, color: noteMode ? "#ffd600" : "#e8e8f0", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto" }} />
                      <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: sending || !input.trim() ? "#1a1a2e" : noteMode ? "linear-gradient(135deg, #ffd600, #f57f17)" : "linear-gradient(135deg, #00c853, #00796b)", color: sending || !input.trim() ? "#444" : "#000", fontSize: 14, fontWeight: 700, cursor: sending || !input.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0 }}>{sending ? "..." : noteMode ? "Nota" : "Enviar"}</button>
                    </div>
                  </div>
                </div>

                {/* Tasks panel */}
                {showTasks && <TasksPanel convId={selected.id} agents={agents} onClose={() => setShowTasks(false)} />}
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

      {showAssign && selected && <AssignModal conversation={selected} agents={agents} onAssign={assignConv} onClose={() => setShowAssign(false)} />}
      {showLabel && selected && <LabelModal conversation={selected} onToggle={toggleLabel} onClose={() => setShowLabel(false)} />}
      {showColManager && <ColumnManagerModal columns={kanbanCols} onChange={setKanbanCols} onClose={() => setShowColManager(false)} />}
    </div>
  );
}
