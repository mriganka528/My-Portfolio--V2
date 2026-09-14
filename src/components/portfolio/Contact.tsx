"use client";
import { useState } from "react";
import { usePortfolioData } from "./provider";
import { socialUrl, externalUrl } from "@/lib/links";
import { useRetryCooldown } from "../useRetryCooldown";

export default function Contact() {
  const { data } = usePortfolioData();
  const { profile } = data;
  const [form, setForm] = useState({ name: "", email: "", msg: "", website: "" });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { retryAfter, handleRateLimit } = useRetryCooldown();

  const links = [
    { label: "email",    val: profile.email,    copy: true },
    { label: "github",   val: profile.github,   href: socialUrl(profile.github) },
    { label: "twitter",  val: profile.twitter,  href: socialUrl(profile.twitter, "twitter") },
    { label: "linkedin", val: profile.linkedin, href: socialUrl(profile.linkedin) },
    { label: "cal.com",  val: profile.cal,      href: socialUrl(profile.cal) },
  ].filter(link => link.val && (link.copy || link.href));

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { window.location.assign(`mailto:${profile.email}`); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, message: form.msg, website: form.website })
      });
      handleRateLimit(response);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send your message.");
      setSent(true);
      setForm({ name: "", email: "", msg: "", website: "" });
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to send your message."); }
    finally { setPending(false); }
  };

  return (
    <section id="contact" className="portfolio-section py-28 px-8 md:px-20 border-t relative" style={{ borderColor: "rgba(0,229,184,0.08)" }}>
      <div className="absolute bottom-0 left-0 w-full max-w-[500px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at left bottom, rgba(0,229,184,0.05) 0%, transparent 65%)" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-14">
          <p className="font-code text-[10px] tracking-widest uppercase mb-3" style={{ color: "var(--teal)" }}>{"// 04 · contact"}</p>
          <h2 className="font-head font-bold leading-[0.9]" style={{ fontSize: "clamp(2.5rem,7vw,6rem)" }}>
            LET&apos;S<br /><span style={{ color: "var(--teal)" }}>BUILD</span><br />SOMETHING
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed mb-10" style={{ color: "#7a9ab5", fontWeight: 300 }}>
              {profile.contactIntro}
            </p>

            <div className="space-y-px">
              {links.map((lk) => (
                <button key={lk.label}
                  onClick={() => lk.copy ? void copyEmail() : window.open(lk.href, "_blank", "noopener,noreferrer")}
                  className="contact-link w-full flex items-center gap-3 sm:gap-5 py-4 px-2 sm:px-5 border-b group transition-colors text-left"
                  style={{ borderColor: "rgba(0,229,184,0.08)" }} data-hover>
                  <span className="font-code text-[9px] tracking-widest uppercase w-16 shrink-0" style={{ color: "var(--dim)" }}>{lk.label}</span>
                  <span className="font-code text-xs flex-1 min-w-0 break-all group-hover:text-[var(--teal)] transition-colors" style={{ color: "#5a7a94" }}>
                    {lk.copy && copied ? "✓ copied!" : lk.val}
                  </span>
                  <span className="font-code text-xs shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all inline-block" style={{ color: "var(--teal)" }}>→</span>
                </button>
              ))}
            </div>

            <div className="mt-10 border p-5" style={{ borderColor: "rgba(0,229,184,0.15)", background: "rgba(0,229,184,0.03)" }}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: profile.available ? "var(--teal)" : "var(--coral)" }} />
                <span className="font-code text-[9px] tracking-widest uppercase" style={{ color: profile.available ? "var(--teal)" : "var(--coral)" }}>
                  {profile.available ? "currently available" : "not available"}
                </span>
              </div>
              <p className="font-code text-xs leading-relaxed" style={{ color: "var(--dim)" }}>
                {profile.availabilityNote}
                {profile.available && externalUrl(profile.cal) && <> <a href={externalUrl(profile.cal)} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--teal)" }}>Schedule a call →</a></>}
              </p>
            </div>
          </div>

          <div className="contact-form min-w-0 border p-5 sm:p-8" style={{ borderColor: "rgba(0,229,184,0.12)", background: "rgba(6,16,26,0.7)" }}>
            <p className="font-code text-[9px] tracking-widest uppercase mb-7" style={{ color: "var(--dim)" }}>{"// send a message"}</p>
            {sent ? (
              <div role="status" className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="font-head font-bold text-5xl" style={{ color: "var(--teal)" }}>SENT</div>
                <p className="font-code text-xs" style={{ color: "var(--dim)" }}>Your message has been received.</p>
                <button type="button" onClick={() => setSent(false)} className="font-code text-xs mt-3" style={{ color: "var(--teal)" }}>send another message →</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="honeypot" aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={event => setForm({ ...form, website: event.target.value })} /></div>
                {[{ key: "name", ph: "Your name", type: "text" }, { key: "email", ph: "Your email address", type: "email" }].map(f => (
                  <div key={f.key}>
                    <label htmlFor={`contact-${f.key}`} className="block font-code text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--dim)" }}>{f.key}</label>
                    <input id={`contact-${f.key}`} name={f.key} autoComplete={f.key} maxLength={f.key === "name" ? 120 : 254} type={f.type} required placeholder={f.ph}
                      value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full bg-transparent border px-4 py-3 font-code text-xs outline-none transition-colors"
                      style={{ borderColor: "rgba(0,229,184,0.15)", color: "var(--text)", caretColor: "var(--teal)" }} />
                  </div>
                ))}
                <div>
                  <label htmlFor="contact-message" className="block font-code text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--dim)" }}>message</label>
                  <textarea id="contact-message" name="message" required minLength={10} maxLength={5000} rows={4} placeholder="Your message"
                    value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })}
                    className="w-full bg-transparent border px-4 py-3 font-code text-xs outline-none resize-none"
                    style={{ borderColor: "rgba(0,229,184,0.15)", color: "var(--text)", caretColor: "var(--teal)" }} />
                </div>
                {error && <p role="alert" className="font-code text-xs" style={{ color: "var(--coral)" }}>{error}</p>}
                <button type="submit" disabled={pending || retryAfter > 0} className="w-full py-3.5 font-code text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--teal)", color: "var(--bg)" }} data-hover>
                  {pending ? "sending…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "send message →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
