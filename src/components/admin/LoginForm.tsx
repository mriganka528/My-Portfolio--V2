"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { REMEMBERED_SESSION_DAYS } from "@/lib/session-policy";
import { useRetryCooldown } from "../useRetryCooldown";

export default function LoginForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const { retryAfter, handleRateLimit } = useRetryCooldown();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, rememberMe })
      });
      handleRateLimit(response);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to sign in.");
      router.replace("/admin"); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setAttempt(value => value + 1);
      setPending(false);
    }
  }

  return <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#04080d" }}>
    <div className="w-full max-w-sm relative z-10">
      <div className="mb-10 text-center">
        <h1 className="font-head font-bold text-2xl mb-2" style={{ color: "var(--teal)" }}>ADMIN ACCESS</h1>
        <p className="font-code text-xs" style={{ color: "var(--dim)" }}>portfolio content management</p>
      </div>
      <motion.form onSubmit={submit} animate={{ x: error && !reduce ? [0, -8, 8, -8, 8, 0] : 0 }} key={attempt} transition={{ duration: 0.4 }}>
        <div className="border p-6 space-y-4" style={{ borderColor: "rgba(0,229,184,0.15)", background: "rgba(6,16,26,0.8)" }}>
          <div>
            <label htmlFor="admin-email" className="block font-code text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--dim)" }}>email</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" autoFocus required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full bg-transparent border px-4 py-3 font-code text-sm outline-none" style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--text)", caretColor: "var(--teal)" }} />
          </div>
          <div>
            <label htmlFor="admin-password" className="block font-code text-[9px] tracking-widest uppercase mb-2" style={{ color: "var(--dim)" }}>password</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} className="w-full bg-transparent border px-4 py-3 font-code text-sm outline-none" style={{ borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)", color: "var(--text)", caretColor: "var(--teal)" }} />
          </div>
          <div>
            <label htmlFor="admin-remember" className="flex items-center gap-3 font-code text-[10px] cursor-pointer" style={{ color: "var(--text)" }}>
              <input id="admin-remember" name="rememberMe" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} aria-describedby="session-duration" className="h-4 w-4 shrink-0 accent-[var(--teal)]" />
              Keep me signed in for {REMEMBERED_SESSION_DAYS} days
            </label>
            <p id="session-duration" className="font-code text-[9px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>When unchecked, your session lasts 12 hours.</p>
          </div>
          {error && <p id="login-error" role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}
          <button disabled={pending || retryAfter > 0} type="submit" className="w-full py-3 font-code text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "authenticating…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "authenticate →"}</button>
        </div>
      </motion.form>
      <p className="font-code text-[9px] text-center mt-6" style={{ color: "#2a4060" }}>this page is not linked from the portfolio</p>
    </div>
  </div>;
}
