"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig, motion } from "framer-motion";
import { portfolioSchema, type PortfolioData } from "@/lib/content-schema";
import { ProfileTab, SkillsTab, ProjectsTab, ExperienceTab, Toast } from "./ContentTabs";
import MessagesTab from "./MessagesTab";

const TABS = ["profile", "skills", "projects", "experience", "messages"] as const;
type Tab = typeof TABS[number];

export default function AdminEditor({ initialData, email }: { initialData: PortfolioData; email: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialData);
  const [saved, setSaved] = useState(initialData);
  const [tab, setTab] = useState<Tab>("profile");
  const [toast, setToast] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const closeToast = useCallback(() => setToast(""), []);

  function showError(message: string) {
    setError(message);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (data: PortfolioData) => { setDraft(data); setDirty(true); setError(""); };

  async function save() {
    if (pending) return;
    const result = portfolioSchema.safeParse(draft);
    if (!result.success) {
      showError(result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(" "));
      return;
    }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result.data) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save changes.");
      const next = portfolioSchema.parse(body);
      setSaved(next); setDraft(next); setDirty(false); setToast("Changes saved to portfolio");
    } catch (error) { showError(error instanceof Error ? error.message : "Unable to save changes."); }
    finally { setPending(false); }
  }

  function reset() {
    if (dirty && !window.confirm("Discard your unsaved changes? Published content will remain unchanged.")) return;
    setDraft(saved); setDirty(false); setError(""); setEditorKey(value => value + 1);
    setToast("Unsaved changes discarded");
  }

  async function logout() {
    if (dirty && !window.confirm("You have unsaved changes. Log out and discard them?")) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to log out. Please try again.");
      setDirty(false); router.replace("/admin/login"); router.refresh();
    } catch (error) { showError(error instanceof Error ? error.message : "Unable to log out."); setPending(false); }
  }

  return <MotionConfig reducedMotion="user"><div className="min-h-screen" style={{ background: "#04080d", color: "var(--text)" }}>
    <header className="admin-header sticky top-0 z-40 border-b px-6 h-14 flex items-center justify-between" style={{ borderColor: "rgba(0,229,184,0.12)", background: "rgba(4,8,13,0.95)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-4">
        <span className="font-head font-bold text-sm" style={{ color: "var(--teal)" }}>ADMIN</span>
        <span className="font-code text-[10px]" style={{ color: "var(--dim)" }}>portfolio cms</span>
        {dirty && <span className="font-code text-[9px] px-2 py-0.5" style={{ background: "rgba(255,199,0,0.12)", color: "#f5c400", border: "1px solid rgba(245,196,0,0.3)" }}>unsaved changes</span>}
      </div>
      <div className="admin-header-actions flex items-center gap-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="font-code text-[10px] px-3 py-1.5 border transition-colors hover:bg-teal-400/5" style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }}>view site ↗</a>
        <button disabled={pending} onClick={reset} title="Discard unsaved changes" className="font-code text-[10px] px-3 py-1.5 border transition-colors" style={{ borderColor: "rgba(255,77,109,0.2)", color: "var(--coral)" }}>reset</button>
        <button disabled={pending || !dirty} onClick={save} className="font-code text-[10px] px-4 py-1.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "please wait…" : "save changes"}</button>
        <button disabled={pending} onClick={logout} className="font-code text-[10px]" style={{ color: "var(--dim)" }}>logout</button>
      </div>
    </header>

    <div className="admin-body flex min-h-[calc(100vh-56px)]">
      <nav aria-label="Content management" className="admin-nav w-48 shrink-0 border-r sticky top-14 self-start h-[calc(100vh-56px)] flex flex-col py-6 px-4 gap-1" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
        {TABS.map(item => <button key={item} aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)} className="font-code text-[10px] tracking-widest uppercase text-left px-3 py-2.5 border transition-colors" style={{ borderColor: tab === item ? "rgba(0,229,184,0.3)" : "transparent", background: tab === item ? "rgba(0,229,184,0.05)" : "transparent", color: tab === item ? "var(--teal)" : "var(--dim)" }}>{item}</button>)}
        <div className="admin-nav-note mt-auto pt-6 border-t" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
          <div className="font-code text-[8px] leading-relaxed" style={{ color: "var(--dim)" }}>
            <p>Changes go live immediately after saving.</p>
            <p className="mt-2 break-all">{email}</p>
          </div>
        </div>
      </nav>

      <main className="admin-main flex-1 min-w-0 px-8 py-8 pb-28 max-w-4xl">
        <div className="mb-6">
          <h1 className="font-head font-bold text-xl capitalize" style={{ color: "var(--text)" }}>{tab}</h1>
          <p className="font-code text-[10px] mt-1" style={{ color: "var(--dim)" }}>
            {tab === "profile" && "Edit your personal info, bio, and contact details."}
            {tab === "skills" && "Manage your tech stack. Icon slugs from simpleicons.org."}
            {tab === "projects" && "Add, edit, or reorder your portfolio projects."}
            {tab === "experience" && "Manage your work history. Use ↑↓ to reorder."}
            {tab === "messages" && "Read and manage messages sent through your portfolio."}
          </p>
        </div>
        {error && <div role="alert" className="border p-4 mb-6 font-code text-xs break-words" style={{ color: "var(--coral)", borderColor: "rgba(255,77,109,0.3)" }}>{error}</div>}
        <motion.div key={`${tab}-${editorKey}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
          <fieldset disabled={pending} className="min-w-0">
            {tab === "profile" && <ProfileTab data={draft} onChange={change} />}
            {tab === "skills" && <SkillsTab data={draft} onChange={change} />}
            {tab === "projects" && <ProjectsTab data={draft} onChange={change} />}
            {tab === "experience" && <ExperienceTab data={draft} onChange={change} />}
          </fieldset>
          {tab === "messages" && <MessagesTab />}
        </motion.div>
        {dirty && <div className="fixed bottom-6 right-6 z-50"><button disabled={pending} onClick={save} className="font-code text-sm px-6 py-3 font-medium shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)", boxShadow: "0 0 30px rgba(0,229,184,0.3)" }}>{pending ? "saving…" : "save changes →"}</button></div>}
      </main>
    </div>
    {toast && <Toast msg={toast} onClose={closeToast} />}
  </div></MotionConfig>;
}
