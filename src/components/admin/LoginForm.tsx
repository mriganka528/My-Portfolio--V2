"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { REMEMBERED_SESSION_DAYS } from "@/lib/session-policy";
import { useRetryCooldown } from "../useRetryCooldown";
import { useResendCooldown } from "../useResendCooldown";

type Mode = "login" | "login-otp" | "forgot" | "forgot-otp" | "reset";

const inputClass = "w-full bg-transparent border px-4 py-3 font-code text-sm outline-none";
const inputStyle = { borderColor: "rgba(0,229,184,0.2)", color: "var(--text)", caretColor: "var(--teal)" };
const labelClass = "block font-code text-[9px] tracking-widest uppercase mb-2";

export default function LoginForm() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [notice, setNotice] = useState("");
  const { retryAfter, handleRateLimit } = useRetryCooldown();
  const resend = useResendCooldown(60);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);

  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setDevelopmentCode("");
    setCode("");
  }

  function fail(message: string) {
    setError(message);
    setAttempt(value => value + 1);
    setPending(false);
  }

  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    handleRateLimit(response);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to complete this request.");
    return data as { otpRequired?: boolean; email?: string; developmentCode?: string };
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/auth/login", { email: email.trim(), password, rememberMe });
      setMaskedEmail(data.email || email.trim());
      setDevelopmentCode(data.developmentCode || "");
      resend.start();
      setMode("login-otp");
      setCode("");
      setPending(false);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to sign in.");
    }
  }

  async function submitLoginCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      await post("/api/auth/login/verify", { code });
      router.replace("/admin"); router.refresh();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to verify this code.");
    }
  }

  async function resendLoginCode() {
    if (pending || retryAfter > 0 || resend.resendIn > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/auth/login/resend", {});
      setMaskedEmail(data.email || maskedEmail);
      setDevelopmentCode(data.developmentCode || "");
      setNotice("A new verification code has been sent.");
      resend.start();
      setPending(false);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to resend the code.");
    }
  }

  async function submitForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/auth/forgot-password", { email: email.trim() });
      setMaskedEmail(email.trim());
      setDevelopmentCode(data.developmentCode || "");
      resend.start();
      setMode("forgot-otp");
      setCode("");
      setPending(false);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to send a reset code.");
    }
  }

  async function resendForgotCode() {
    if (pending || retryAfter > 0 || resend.resendIn > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/auth/forgot-password", { email: email.trim() });
      setDevelopmentCode(data.developmentCode || "");
      setNotice("A new verification code has been sent.");
      resend.start();
      setPending(false);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to resend the code.");
    }
  }

  async function submitForgotCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      await post("/api/auth/forgot-password/verify", { code });
      setDevelopmentCode("");
      setMode("reset");
      setCode("");
      setPending(false);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to verify this code.");
    }
  }

  async function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Use a password containing 12–128 characters.");
      setAttempt(value => value + 1);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      setAttempt(value => value + 1);
      return;
    }
    setPending(true); setError(""); setNotice("");
    try {
      await post("/api/auth/forgot-password/reset", { password: newPassword });
      router.replace("/admin"); router.refresh();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Unable to reset your password.");
    }
  }

  const heading = {
    login: "ADMIN ACCESS",
    "login-otp": "VERIFY ACCESS",
    forgot: "RESET ACCESS",
    "forgot-otp": "VERIFY ACCESS",
    reset: "NEW PASSWORD"
  }[mode];
  const subheading = {
    login: "portfolio content management",
    "login-otp": maskedEmail ? `code sent to ${maskedEmail}` : "enter your emailed verification code",
    forgot: "enter your registered admin email",
    "forgot-otp": `code sent to ${maskedEmail}`,
    reset: "choose a new admin password"
  }[mode];
  const disabled = pending || retryAfter > 0;

  return <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#04080d" }}>
    <div className="w-full max-w-sm relative z-10">
      <div className="mb-10 text-center">
        <h1 className="font-head font-bold text-2xl mb-2" style={{ color: "var(--teal)" }}>{heading}</h1>
        <p className="font-code text-xs break-all" style={{ color: "var(--dim)" }}>{subheading}</p>
      </div>
      <motion.form onSubmit={
        mode === "login" ? submitLogin
          : mode === "login-otp" ? submitLoginCode
            : mode === "forgot" ? submitForgot
              : mode === "forgot-otp" ? submitForgotCode
                : submitReset
      } animate={{ x: error && !reduce ? [0, -8, 8, -8, 8, 0] : 0 }} key={`${mode}-${attempt}`} transition={{ duration: 0.4 }}>
        <div className="border p-6 space-y-4" style={{ borderColor: "rgba(0,229,184,0.15)", background: "rgba(6,16,26,0.8)" }}>
          {(mode === "login" || mode === "forgot") && <div>
            <label htmlFor="admin-email" className={labelClass} style={{ color: "var(--dim)" }}>email</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" autoFocus required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={inputClass} style={{ ...inputStyle, borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)" }} aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} />
          </div>}

          {mode === "login" && <div>
            <label htmlFor="admin-password" className={labelClass} style={{ color: "var(--dim)" }}>password</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" className={inputClass} style={{ ...inputStyle, borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)" }} aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} />
          </div>}

          {(mode === "login-otp" || mode === "forgot-otp") && <>
            <div>
              <label htmlFor="admin-code" className={labelClass} style={{ color: "var(--dim)" }}>verification code</label>
              <input id="admin-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" autoFocus required maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${inputClass} text-center text-lg tracking-[0.4em]`} style={{ ...inputStyle, borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)" }} aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} />
              <p className="font-code text-[9px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>The code expires in 10 minutes and can be used once.</p>
            </div>
            {developmentCode && <p className="font-code text-[9px] leading-relaxed" style={{ color: "var(--dim)" }}>local development code: <span style={{ color: "var(--teal)" }}>{developmentCode}</span></p>}
          </>}

          {mode === "reset" && <>
            <div>
              <label htmlFor="admin-new-password" className={labelClass} style={{ color: "var(--dim)" }}>new password</label>
              <input id="admin-new-password" name="newPassword" type="password" autoComplete="new-password" autoFocus required minLength={12} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="••••••••••••" className={inputClass} style={{ ...inputStyle, borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)" }} aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} />
            </div>
            <div>
              <label htmlFor="admin-confirm-password" className={labelClass} style={{ color: "var(--dim)" }}>confirm password</label>
              <input id="admin-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="••••••••••••" className={inputClass} style={{ ...inputStyle, borderColor: error ? "var(--coral)" : "rgba(0,229,184,0.2)" }} aria-describedby={error ? "login-error" : undefined} aria-invalid={!!error} />
              <p className="font-code text-[9px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>Use 12–128 characters.</p>
            </div>
          </>}

          {mode === "login" && <div>
            <label htmlFor="admin-remember" className="flex items-center gap-3 font-code text-[10px] cursor-pointer" style={{ color: "var(--text)" }}>
              <input id="admin-remember" name="rememberMe" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} aria-describedby="session-duration" className="h-4 w-4 shrink-0 accent-[var(--teal)]" />
              Keep me signed in for {REMEMBERED_SESSION_DAYS} days
            </label>
            <p id="session-duration" className="font-code text-[9px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>When unchecked, your session lasts 12 hours.</p>
          </div>}

          {notice && <p role="status" className="font-code text-[10px]" style={{ color: "var(--teal)" }}>{notice}</p>}
          {error && <p id="login-error" role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}

          <button disabled={disabled} type="submit" className="w-full py-3 font-code text-sm font-medium tracking-wide transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>
            {pending
              ? mode === "login" ? "authenticating…" : mode === "reset" ? "resetting…" : "please wait…"
              : retryAfter > 0 ? `try again in ${retryAfter}s`
                : mode === "login" ? "authenticate →"
                  : mode === "login-otp" ? "verify code →"
                    : mode === "forgot" ? "send code →"
                      : mode === "forgot-otp" ? "verify code →"
                        : "reset password →"}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 font-code text-[10px]">
            {mode === "login" && <button type="button" onClick={() => changeMode("forgot")} style={{ color: "var(--dim)" }} className="hover:opacity-80">forgot password?</button>}
            {(mode === "login-otp" || mode === "forgot-otp") && <button type="button" disabled={pending || retryAfter > 0 || resend.resendIn > 0} onClick={mode === "login-otp" ? resendLoginCode : resendForgotCode} style={{ color: "var(--dim)" }} className="disabled:opacity-50">{resend.resendIn > 0 ? `resend code in ${resend.resendIn}s` : "resend code"}</button>}
            {mode !== "login" && <button type="button" onClick={() => changeMode("login")} style={{ color: "var(--dim)" }} className="hover:opacity-80">← back to sign in</button>}
            {mode === "login-otp" && <button type="button" onClick={() => changeMode("login")} style={{ color: "var(--dim)" }} className="hover:opacity-80">use a different account</button>}
          </div>
        </div>
      </motion.form>
      <p className="font-code text-[9px] text-center mt-6" style={{ color: "#2a4060" }}>this page is not linked from the portfolio</p>
    </div>
  </div>;
}
