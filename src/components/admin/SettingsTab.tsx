"use client";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useRetryCooldown } from "../useRetryCooldown";
import { useResendCooldown } from "../useResendCooldown";

const inputCls = "w-full bg-transparent border px-3 py-2.5 font-code text-xs outline-none transition-colors focus:border-teal-400/40";
const inputStyle = { borderColor: "rgba(0,229,184,0.15)", color: "var(--text)", caretColor: "var(--teal)" };
const labelCls = "block font-code text-[9px] tracking-widest uppercase mb-1.5";
const labelStyle = { color: "var(--dim)" };
const secondaryBtn = "font-code text-[10px] px-3 py-2 border transition-colors disabled:opacity-50";

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <div>
    <label htmlFor={id} className={labelCls} style={labelStyle}>{label}</label>
    <input id={id} {...props} className={inputCls} style={inputStyle} />
  </div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="admin-section-card border p-6" style={{ borderColor: "rgba(0,229,184,0.1)", background: "rgba(6,16,26,0.5)" }}>
    <h3 className="font-head font-bold text-base mb-5" style={{ color: "var(--teal)" }}>{title}</h3>
    {children}
  </div>;
}

function CodeField({ value, onChange, pending }: { value: string; onChange: (value: string) => void; pending: boolean }) {
  const id = useId();
  return <div>
    <label htmlFor={id} className={labelCls} style={labelStyle}>verification code</label>
    <input id={id} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" autoFocus required maxLength={6} value={value} disabled={pending} onChange={event => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className={`${inputCls} text-center text-lg tracking-[0.4em]`} style={inputStyle} />
    <p className="font-code text-[9px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>The code expires in 10 minutes and can be used once.</p>
  </div>;
}

function DevelopmentCode({ code }: { code: string }) {
  if (!code) return null;
  return <p className="font-code text-[9px] leading-relaxed" style={{ color: "var(--dim)" }}>local development code: <span style={{ color: "var(--teal)" }}>{code}</span></p>;
}

function PasswordSettings({ notify }: { notify: (message: string) => void }) {
  const [stage, setStage] = useState<"form" | "verify">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { retryAfter, handleRateLimit } = useRetryCooldown();
  const resend = useResendCooldown(60);

  async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    handleRateLimit(response);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to update your password.");
    return data as { email?: string; developmentCode?: string };
  }

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Use a password containing 12–128 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match."); return;
    }
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/admin/settings/password", { currentPassword, newPassword });
      setMaskedEmail(data.email || "");
      setDevelopmentCode(data.developmentCode || "");
      setCode("");
      setStage("verify");
      setNotice("A verification code has been sent to your admin email.");
      resend.start();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to send a verification code."); }
    finally { setPending(false); }
  }

  async function resendCode() {
    if (pending || retryAfter > 0 || resend.resendIn > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/admin/settings/password", { currentPassword, newPassword });
      setMaskedEmail(data.email || maskedEmail);
      setDevelopmentCode(data.developmentCode || "");
      setNotice("A new verification code has been sent.");
      resend.start();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to resend the code."); }
    finally { setPending(false); }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      await post("/api/admin/settings/password/verify", { code });
      setStage("form");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setCode("");
      setDevelopmentCode(""); setNotice("");
      notify("Password updated · other sessions signed out");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to verify this code."); }
    finally { setPending(false); }
  }

  function cancel() {
    setStage("form"); setCode(""); setDevelopmentCode(""); setError(""); setNotice("");
  }

  const disabled = pending || retryAfter > 0;

  return <Card title="Reset password">
    {stage === "form" ? <form onSubmit={requestCode} className="space-y-4">
      <Field label="Current password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="••••••••" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="New password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="••••••••••••" />
        <Field label="Confirm new password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="••••••••••••" />
      </div>
      <p className="font-code text-[9px] leading-relaxed" style={{ color: "var(--dim)" }}>Use 12–128 characters. A verification code will be sent to your registered admin email before the change is applied.</p>
      {notice && <p role="status" className="font-code text-[10px]" style={{ color: "var(--teal)" }}>{notice}</p>}
      {error && <p role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}
      <button disabled={disabled} type="submit" className="font-code text-[10px] px-4 py-2.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "sending code…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "send verification code →"}</button>
    </form> : <form onSubmit={verifyCode} className="space-y-4">
      <p className="font-code text-[10px] leading-relaxed" style={{ color: "var(--text)" }}>Enter the code sent to <span style={{ color: "var(--teal)" }}>{maskedEmail || "your admin email"}</span> to confirm the new password.</p>
      <CodeField value={code} onChange={setCode} pending={pending} />
      <DevelopmentCode code={developmentCode} />
      {notice && <p role="status" className="font-code text-[10px]" style={{ color: "var(--teal)" }}>{notice}</p>}
      {error && <p role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={disabled || code.length !== 6} type="submit" className="font-code text-[10px] px-4 py-2.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "verifying…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "confirm password change →"}</button>
        <button disabled={disabled || resend.resendIn > 0} type="button" onClick={resendCode} className={secondaryBtn} style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }}>{resend.resendIn > 0 ? `resend in ${resend.resendIn}s` : "resend code"}</button>
        <button disabled={pending} type="button" onClick={cancel} className="font-code text-[10px]" style={{ color: "var(--dim)" }}>cancel</button>
      </div>
    </form>}
  </Card>;
}

function EmailSettings({ email, notify }: { email: string; notify: (message: string) => void }) {
  const router = useRouter();
  const [savedEmail, setSavedEmail] = useState("");
  const [stage, setStage] = useState<"form" | "verify">("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const { retryAfter, handleRateLimit } = useRetryCooldown();
  const resend = useResendCooldown(60);

  const displayEmail = savedEmail || email;

  async function post(url: string, body: unknown) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    handleRateLimit(response);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to update your email.");
    return data as { email?: string; developmentCode?: string };
  }

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    const normalized = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Enter a valid email address."); return;
    }
    if (normalized === email.toLowerCase()) {
      setError("That is already your sign-in email."); return;
    }
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/admin/settings/email", { currentPassword, email: normalized });
      setMaskedEmail(data.email || normalized);
      setDevelopmentCode(data.developmentCode || "");
      setCode("");
      setStage("verify");
      setNotice("A verification code has been sent to the new email address.");
      resend.start();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to send a verification code."); }
    finally { setPending(false); }
  }

  async function resendCode() {
    if (pending || retryAfter > 0 || resend.resendIn > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/admin/settings/email", { currentPassword, email: newEmail.trim().toLowerCase() });
      setMaskedEmail(data.email || maskedEmail);
      setDevelopmentCode(data.developmentCode || "");
      setNotice("A new verification code has been sent.");
      resend.start();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to resend the code."); }
    finally { setPending(false); }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || retryAfter > 0) return;
    setPending(true); setError(""); setNotice("");
    try {
      const data = await post("/api/admin/settings/email/verify", { code });
      const changedEmail = data.email || newEmail.trim().toLowerCase();
      setSavedEmail(changedEmail);
      setStage("form");
      setCurrentPassword(""); setNewEmail(""); setCode("");
      setDevelopmentCode(""); setNotice("");
      notify("Sign-in email updated · other sessions signed out");
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to verify this code."); }
    finally { setPending(false); }
  }

  function cancel() {
    setStage("form"); setCode(""); setDevelopmentCode(""); setError(""); setNotice("");
  }

  const disabled = pending || retryAfter > 0;

  return <Card title="Change email">
    <div className="mb-4 border px-3 py-2.5 font-code text-[10px] break-all" style={{ borderColor: "rgba(0,229,184,0.1)", color: "var(--dim)" }}>
      current sign-in email: <span style={{ color: "var(--text)" }}>{displayEmail || "not set"}</span>
    </div>
    {stage === "form" ? <form onSubmit={requestCode} className="space-y-4">
      <Field label="New email address" type="email" autoComplete="email" required maxLength={254} value={newEmail} onChange={event => setNewEmail(event.target.value)} placeholder="you@example.com" />
      <Field label="Current password" type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} placeholder="••••••••" />
      <p className="font-code text-[9px] leading-relaxed" style={{ color: "var(--dim)" }}>A verification code will be sent to the new address. Your password is required to confirm this change.</p>
      {notice && <p role="status" className="font-code text-[10px]" style={{ color: "var(--teal)" }}>{notice}</p>}
      {error && <p role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}
      <button disabled={disabled} type="submit" className="font-code text-[10px] px-4 py-2.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "sending code…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "send verification code →"}</button>
    </form> : <form onSubmit={verifyCode} className="space-y-4">
      <p className="font-code text-[10px] leading-relaxed" style={{ color: "var(--text)" }}>Enter the code sent to <span style={{ color: "var(--teal)" }}>{maskedEmail || "the new address"}</span> to make it your sign-in email.</p>
      <CodeField value={code} onChange={setCode} pending={pending} />
      <DevelopmentCode code={developmentCode} />
      {notice && <p role="status" className="font-code text-[10px]" style={{ color: "var(--teal)" }}>{notice}</p>}
      {error && <p role="alert" className="font-code text-[10px]" style={{ color: "var(--coral)" }}>{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={disabled || code.length !== 6} type="submit" className="font-code text-[10px] px-4 py-2.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: "var(--teal)", color: "var(--bg)" }}>{pending ? "verifying…" : retryAfter > 0 ? `try again in ${retryAfter}s` : "confirm email change →"}</button>
        <button disabled={disabled || resend.resendIn > 0} type="button" onClick={resendCode} className={secondaryBtn} style={{ borderColor: "rgba(0,229,184,0.2)", color: "var(--dim)" }}>{resend.resendIn > 0 ? `resend in ${resend.resendIn}s` : "resend code"}</button>
        <button disabled={pending} type="button" onClick={cancel} className="font-code text-[10px]" style={{ color: "var(--dim)" }}>cancel</button>
      </div>
    </form>}
  </Card>;
}

export default function SettingsTab({ email, notify }: { email: string; notify: (message: string) => void }) {
  return <div className="space-y-6">
    <div className="border p-5" style={{ borderColor: "rgba(0,229,184,0.12)", background: "rgba(6,16,26,0.4)" }}>
      <p className="font-code text-[10px] leading-relaxed" style={{ color: "var(--dim)" }}>
        Security changes are confirmed with a one-time code sent by email. Changing your password or email signs out all other active sessions.
      </p>
    </div>
    <EmailSettings email={email} notify={notify} />
    <PasswordSettings notify={notify} />
  </div>;
}
