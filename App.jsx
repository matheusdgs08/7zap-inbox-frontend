import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = "https://7zap-inbox-production.up.railway.app";
const API_KEY = "7zap_inbox_secret";
const TENANT_ID = "98c38c97-2796-471f-bfc9-f093ff3ae6e9";

const headers = { "x-api-key": API_KEY, "Content-Type": "application/json" };

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
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

function Avatar({ name, size = 36 }) {
  const colors = ["#00c853","#00bcd4","#7c4dff","#ff6d00","#e91e63","#3d5afe"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
      color: "#fff", flexShrink: 0, fontFamily: "inherit",
    }}>
      {initials(name)}
    </div>
  );
}

function StatusDot({ status }) {
  const colors = { open: "#00c853", pending: "#ffd600", resolved: "#555" };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[status] || "#555", display: "inline-block", flexShrink: 0 }} />;
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/conversations?tenant_id=${TENANT_ID}&status=${filter}`, { headers });
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch (e) {}
    setLoading(false);
  }, [filter]);

  const fetchMessages = useCallback(async (convId) => {
    try {
      const r = await fetch(`${API_URL}/conversations/${convId}/messages`, { headers });
      const d = await r.json();
      setMessages(d.messages || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchConversations();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchConversations, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchConversations]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.id);
    const t = setInterval(() => fetchMessages(selected.id), 5000);
    return () => clearInterval(t);
  }, [selected, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/conversations/${selected.id}/messages`, {
        method: "POST", headers,
        body: JSON.stringify({ conversation_id: selected.id, text: input.trim() }),
      });
      setInput("");
      await fetchMessages(selected.id);
      await fetchConversations();
    } catch (e) {}
    setSending(false);
  };

  const resolveConv = async (convId) => {
    await fetch(`${API_URL}/conversations/${convId}/resolve`, { method: "PUT", headers });
    setSelected(null);
    fetchConversations();
  };

  const filtered = conversations.filter(c =>
    (c.contacts?.name || c.contacts?.phone || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      background: "#0a0a0f", color: "#e8e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      overflow: "hidden",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
        borderRight: "1px solid #1a1a2e", background: "#0d0d18",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #1a1a2e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #00c853, #00796b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px" }}>7zap</span>
            <span style={{
              marginLeft: "auto", fontSize: 11, background: "#00c85320",
              color: "#00c853", padding: "2px 8px", borderRadius: 20, fontWeight: 600,
            }}>INBOX</span>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.4 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              style={{
                width: "100%", padding: "8px 12px 8px 32px",
                background: "#1a1a2e", border: "1px solid #252540",
                borderRadius: 8, color: "#e8e8f0", fontSize: 13,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", padding: "8px 12px", gap: 6, borderBottom: "1px solid #1a1a2e" }}>
          {["open", "pending", "resolved"].map(f => (
            <button key={f} onClick={() => { setFilter(f); setSelected(null); }} style={{
              flex: 1, padding: "6px 0", borderRadius: 6, border: "none",
              background: filter === f ? "#00c85320" : "transparent",
              color: filter === f ? "#00c853" : "#888",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", fontFamily: "inherit",
            }}>
              {f === "open" ? "Abertos" : f === "pending" ? "Pendentes" : "Resolvidos"}
            </button>
          ))}
        </div>

        {/* Conversations list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#555", fontSize: 13 }}>
              Nenhuma conversa {filter === "open" ? "aberta" : filter === "pending" ? "pendente" : "resolvida"}
            </div>
          ) : filtered.map(conv => (
            <div
              key={conv.id}
              onClick={() => setSelected(conv)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", cursor: "pointer",
                background: selected?.id === conv.id ? "#1a1a2e" : "transparent",
                borderLeft: selected?.id === conv.id ? "3px solid #00c853" : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <Avatar name={conv.contacts?.name || conv.contacts?.phone} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.contacts?.name || conv.contacts?.phone}
                  </span>
                  <span style={{ fontSize: 11, color: "#555", flexShrink: 0 }}>
                    {timeAgo(conv.last_message_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusDot status={conv.status} />
                  <span style={{ fontSize: 12, color: "#666", flex: 1 }}>
                    {conv.contacts?.phone}
                  </span>
                  {conv.unread_count > 0 && (
                    <span style={{
                      background: "#00c853", color: "#000", fontSize: 10,
                      fontWeight: 700, padding: "1px 6px", borderRadius: 10, flexShrink: 0,
                    }}>{conv.unread_count}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a2e", fontSize: 12, color: "#444", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00c853" }} />
          Estúdio Se7e · {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Main chat area */}
      {selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Chat header */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid #1a1a2e",
            display: "flex", alignItems: "center", gap: 12, background: "#0d0d18",
          }}>
            <Avatar name={selected.contacts?.name || selected.contacts?.phone} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {selected.contacts?.name || selected.contacts?.phone}
              </div>
              <div style={{ fontSize: 12, color: "#555" }}>
                {selected.contacts?.phone} · <StatusDot status={selected.status} /> <span style={{ textTransform: "capitalize" }}>{selected.status}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => resolveConv(selected.id)}
                style={{
                  padding: "7px 14px", borderRadius: 8, border: "1px solid #1a1a2e",
                  background: "transparent", color: "#888", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                }}
              >
                ✓ Resolver
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#444", fontSize: 13, marginTop: 40 }}>
                Nenhuma mensagem ainda
              </div>
            ) : messages.map((msg, i) => {
              const isOut = msg.direction === "outbound";
              const isInternal = msg.is_internal_note;
              return (
                <div key={msg.id || i} style={{
                  display: "flex", justifyContent: isOut ? "flex-end" : "flex-start",
                  marginBottom: 2,
                }}>
                  <div style={{
                    maxWidth: "65%", padding: "10px 14px", borderRadius: isOut ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                    background: isInternal ? "#2a2010" : isOut ? "#00c85322" : "#1a1a2e",
                    border: isInternal ? "1px solid #554020" : isOut ? "1px solid #00c85340" : "1px solid #252540",
                    fontSize: 14, lineHeight: 1.5,
                    color: isInternal ? "#aa8040" : isOut ? "#b0f0c0" : "#e8e8f0",
                  }}>
                    {isInternal && <div style={{ fontSize: 10, fontWeight: 700, color: "#aa8040", marginBottom: 4 }}>NOTA INTERNA</div>}
                    <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
                    <div style={{ fontSize: 10, color: "#555", marginTop: 4, textAlign: isOut ? "right" : "left" }}>
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a2e", background: "#0d0d18" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                placeholder="Digite uma mensagem... (Enter para enviar)"
                rows={1}
                style={{
                  flex: 1, padding: "10px 14px", background: "#1a1a2e",
                  border: "1px solid #252540", borderRadius: 10, color: "#e8e8f0",
                  fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit",
                  lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                style={{
                  padding: "10px 18px", borderRadius: 10, border: "none",
                  background: sending || !input.trim() ? "#1a1a2e" : "linear-gradient(135deg, #00c853, #00796b)",
                  color: sending || !input.trim() ? "#444" : "#000",
                  fontSize: 14, fontWeight: 700, cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0,
                }}
              >
                {sending ? "..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16, color: "#333",
        }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#444" }}>Selecione uma conversa</div>
          <div style={{ fontSize: 13, color: "#333" }}>Escolha uma conversa na lista ao lado</div>
        </div>
      )}
    </div>
  );
}
