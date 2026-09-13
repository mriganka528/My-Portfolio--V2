"use client";
import { useEffect, useState } from "react";

type Message = { id: string; name: string; email: string; message: string; read: boolean; createdAt: string };
type Inbox = { messages: Message[]; page: number; pages: number; total: number; unread: number };

async function fetchInbox(page: number, signal: AbortSignal): Promise<Inbox> {
  const response = await fetch(`/api/admin/messages?page=${page}`, { signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load messages.");
  return data;
}

export default function MessagesTab() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchInbox(page, controller.signal).then(
      data => {
        if (controller.signal.aborted) return;
        setInbox(data); setError("");
        if (data.pages < page) setPage(data.pages);
        else setLoading(false);
      },
      error => {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : "Unable to load messages.");
        setLoading(false);
      }
    );
    return () => controller.abort();
  }, [page, revision]);

  function refresh() {
    setLoading(true);
    setRevision(value => value + 1);
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setPage(nextPage);
  }

  async function update(message: Message, remove = false) {
    if (remove && !window.confirm("Permanently delete this message?")) return;
    setPending(message.id); setError("");
    try {
      const response = await fetch(`/api/admin/messages/${message.id}`, {
        method: remove ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(!remove ? { body: JSON.stringify({ read: !message.read }) } : {})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update this message.");
      refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to update this message."); }
    finally { setPending(""); }
  }

  const buttonClass = "font-code text-[10px] border px-3 py-1.5 border-teal-400/20 text-[var(--teal)] disabled:opacity-40";
  return <div className="space-y-4">
    <div className="flex justify-between items-center gap-3">
      <p className="font-code text-xs text-[var(--dim)]">{inbox ? `${inbox.total} messages · ${inbox.unread} unread` : "Loading messages…"}</p>
      <button disabled={loading} onClick={refresh} className={buttonClass}>refresh</button>
    </div>
    {error && <p role="alert" className="font-code text-xs text-[var(--coral)]">{error}</p>}
    {inbox?.messages.map(message => <article key={message.id} className="border p-5 space-y-4" style={{ borderColor: message.read ? "rgba(0,229,184,0.1)" : "rgba(0,229,184,0.3)", background: "rgba(6,16,26,0.5)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-head font-bold">{message.name}</h2><a className="font-code text-[10px] text-[var(--teal)] break-all" href={`mailto:${message.email}`}>{message.email}</a></div>
        <time className="font-code text-[9px] text-[var(--dim)]" dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" style={{ color: "#7a9ab5" }}>{message.message}</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={!!pending || loading} onClick={() => update(message)} className={buttonClass}>{message.read ? "mark unread" : "mark read"}</button>
        <a href={`mailto:${message.email}`} className={buttonClass}>reply ↗</a>
        <button disabled={!!pending || loading} onClick={() => update(message, true)} className="font-code text-[10px] border border-rose-400/20 text-[var(--coral)] px-3 py-1.5 disabled:opacity-40">delete</button>
      </div>
    </article>)}
    {inbox && !inbox.total && <p className="empty-state">No messages yet. New messages from your contact form will appear here.</p>}
    {inbox && inbox.pages > 1 && <div className="flex items-center gap-4">
      <button disabled={page === 1 || loading} onClick={() => changePage(page - 1)} className={buttonClass}>← previous</button>
      <span className="font-code text-[10px] text-[var(--dim)]">{page} / {inbox.pages}</span>
      <button disabled={page === inbox.pages || loading} onClick={() => changePage(page + 1)} className={buttonClass}>next →</button>
    </div>}
  </div>;
}
