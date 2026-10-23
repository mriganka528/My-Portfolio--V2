import "server-only";
import nodemailer from "nodemailer";
import { HttpError } from "./http";

export class EmailDeliveryError extends HttpError {
  constructor(message = "Email delivery is unavailable. Please try again later.") {
    super(503, message);
  }
}

const OTP_COPY = {
  login: {
    subject: "Your admin sign-in code",
    heading: "Admin sign-in verification",
    intro: "Use the code below to finish signing in to your portfolio admin panel."
  },
  "password-reset": {
    subject: "Reset your admin password",
    heading: "Password reset verification",
    intro: "Use the code below to reset the password for your portfolio admin panel."
  },
  "settings-password": {
    subject: "Confirm your admin password change",
    heading: "Password change verification",
    intro: "Use the code below to confirm the password change for your portfolio admin panel."
  },
  "settings-email": {
    subject: "Confirm your new admin email",
    heading: "Email change verification",
    intro: "Use the code below to confirm this address as the new sign-in email for your portfolio admin panel."
  }
} as const;

export type OtpPurpose = keyof typeof OTP_COPY;

function smtpHost() {
  return process.env.SMTP_HOST?.trim() ?? "";
}

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() ?? "";
}

export function emailDeliveryConfigured() {
  return Boolean(smtpHost() || resendKey());
}

function fromAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  const user = process.env.SMTP_USER?.trim();
  if (user) return `Portfolio Admin <${user}>`;
  return "Portfolio Admin <onboarding@resend.dev>";
}

function escaped(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character] ?? character));
}

function istTimestamp(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date).replace(/\b(am|pm)\b/i, value => value.toUpperCase());
  return `${formatted} IST`;
}

let credentialsChecked = false;
// Google only accepts a 16 character App Password over SMTP. The regular
// account password, a password with spaces, or a revoked App Password are the
// most common reasons a mail server rejects the login.
function warnAboutSuspiciousCredentials() {
  if (credentialsChecked) return;
  credentialsChecked = true;
  const host = smtpHost().toLowerCase();
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  if (!host.includes("gmail.com") || !pass) return;
  if (!/^[a-z]{16}$/i.test(pass)) {
    console.warn("[admin-otp] Gmail needs a 16 character App Password for SMTP. The configured SMTP_PASS does not look like one.");
  }
}

function messageFor(code: string, purpose: OtpPurpose, minutes: number) {
  const copy = OTP_COPY[purpose];
  const safeCode = escaped(code);
  const appUrl = process.env.APP_URL?.trim() || "the admin panel";
  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    `Verification code: ${code}`,
    "",
    `This code expires in ${minutes} minutes and can be used once.`,
    "If you did not request this code, you can safely ignore this email. Your account has not been changed.",
    "",
    appUrl
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#04080d;color:#dce8f2;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#04080d;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;border:1px solid rgba(0,229,184,0.2);background:#06101a;">
            <tr>
              <td style="padding:28px 28px 20px;">
                <p style="margin:0 0 18px;color:#00e5b8;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">Portfolio Admin</p>
                <h1 style="margin:0 0 12px;color:#dce8f2;font-size:22px;line-height:1.3;">${escaped(copy.heading)}</h1>
                <p style="margin:0 0 24px;color:#7a9ab5;font-size:14px;line-height:1.7;">${escaped(copy.intro)}</p>
                <p style="margin:0 0 8px;color:#3d5a72;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">Verification code</p>
                <p style="margin:0 0 24px;padding:16px 18px;border:1px solid rgba(0,229,184,0.25);background:rgba(0,229,184,0.06);color:#00e5b8;font-family:'Courier New',monospace;font-size:30px;letter-spacing:0.28em;text-align:center;">${safeCode}</p>
                <p style="margin:0 0 8px;color:#7a9ab5;font-size:13px;line-height:1.7;">This code expires in ${minutes} minutes and can be used once.</p>
                <p style="margin:0;color:#3d5a72;font-size:12px;line-height:1.7;">If you did not request this code, you can safely ignore this email. Your account has not been changed.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject: copy.subject, text, html };
}

type MailMessage = { to: string; subject: string; text: string; html: string; replyTo?: string };

function replyToAddress(input: MailMessage) {
  return input.replyTo?.trim() || process.env.EMAIL_REPLY_TO?.trim() || "";
}

async function sendWithResend(input: MailMessage) {
  const replyTo = replyToAddress(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(replyTo ? { reply_to: replyTo } : {})
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) {
    console.error("Resend delivery failed:", response.status, (await response.text()).slice(0, 300));
    throw new EmailDeliveryError();
  }
}

async function sendWithSmtp(input: MailMessage) {
  const host = smtpHost();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const replyTo = replyToAddress(input);
  warnAboutSuspiciousCredentials();
  let transport: ReturnType<typeof nodemailer.createTransport> | undefined;
  try {
    transport = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      ...(user ? { auth: { user, pass: pass ?? "" } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    });
    await transport.sendMail({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(replyTo ? { replyTo } : {})
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("SMTP delivery failed:", message.split("\n")[0]);
    if (/535|invalid login|authentication failed|EAUTH|bad credentials|rejected/i.test(message)) {
      throw new EmailDeliveryError("The mail server rejected the SMTP credentials. Check SMTP_USER and SMTP_PASS.");
    }
    throw new EmailDeliveryError();
  } finally {
    transport?.close();
  }
}

async function deliver(input: MailMessage) {
  if (smtpHost()) await sendWithSmtp(input);
  else await sendWithResend(input);
}

function describeDevice(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//i.test(userAgent) ? "Edge"
    : /OPR\/|Opera/i.test(userAgent) ? "Opera"
      : /Firefox\//i.test(userAgent) ? "Firefox"
        : /Chrome\/|CriOS\//i.test(userAgent) ? "Chrome"
          : /Safari\//i.test(userAgent) ? "Safari"
            : "Unknown browser";
  const platform = /iPhone|iPad|iPod/i.test(userAgent) ? "iOS"
    : /Android/i.test(userAgent) ? "Android"
      : /Windows/i.test(userAgent) ? "Windows"
        : /Macintosh|Mac OS X/i.test(userAgent) ? "macOS"
          : /Linux/i.test(userAgent) ? "Linux"
            : "unknown platform";
  return `${browser} on ${platform}`;
}

function loginAlertMessage(input: { device: string; ip: string; when: string; method: "password" | "password-reset" }) {
  const appUrl = process.env.APP_URL?.trim() || "the admin panel";
  const action = input.method === "password-reset"
    ? "Your admin password was reset and a new session was started."
    : "A new admin session was started with your password and an emailed verification code.";
  const text = [
    "New admin sign-in",
    "",
    action,
    "",
    `Device: ${input.device}`,
    `IP address: ${input.ip}`,
    `Time: ${input.when}`,
    "",
    "If this was you, no action is needed.",
    "If you do not recognize this sign-in, reset your admin password immediately and review your account.",
    "",
    appUrl
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#04080d;color:#dce8f2;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#04080d;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;border:1px solid rgba(0,229,184,0.2);background:#06101a;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;color:#00e5b8;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">Portfolio Admin</p>
                <h1 style="margin:0 0 12px;color:#dce8f2;font-size:22px;line-height:1.3;">New admin sign-in</h1>
                <p style="margin:0 0 22px;color:#7a9ab5;font-size:14px;line-height:1.7;">${escaped(action)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;border:1px solid rgba(0,229,184,0.18);background:rgba(0,229,184,0.04);">
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Device</td><td style="padding:12px 14px;color:#dce8f2;font-size:13px;text-align:right;">${escaped(input.device)}</td></tr>
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">IP address</td><td style="padding:12px 14px;color:#dce8f2;font-size:13px;text-align:right;">${escaped(input.ip)}</td></tr>
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Time</td><td style="padding:12px 14px;color:#dce8f2;font-size:13px;text-align:right;">${escaped(input.when)}</td></tr>
                </table>
                <p style="margin:0 0 8px;color:#7a9ab5;font-size:13px;line-height:1.7;">If this was you, no action is needed.</p>
                <p style="margin:0;color:#ff4d6d;font-size:12px;line-height:1.7;">If you do not recognize this sign-in, reset your admin password immediately and review your account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject: "Security alert: new admin sign-in", text, html };
}

function contactNotificationMessage(input: { name: string; email: string; message: string; submittedAt: Date }) {
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, "") || "";
  const adminUrl = appUrl ? `${appUrl}/admin` : "the admin panel";
  const received = istTimestamp(input.submittedAt);
  const sender = input.name.replace(/[\r\n]+/g, " ").trim().slice(0, 80) || "a visitor";
  const text = [
    "New contact message",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Received: ${received}`,
    "",
    input.message,
    "",
    "Reply to this email to respond directly to the sender.",
    `Open the admin inbox: ${adminUrl}`
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#04080d;color:#dce8f2;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#04080d;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid rgba(0,229,184,0.2);background:#06101a;">
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;color:#00e5b8;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;">Portfolio Admin</p>
                <h1 style="margin:0 0 12px;color:#dce8f2;font-size:22px;line-height:1.3;">New contact message</h1>
                <p style="margin:0 0 22px;color:#7a9ab5;font-size:14px;line-height:1.7;">Someone sent a message through your portfolio contact form.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;border:1px solid rgba(0,229,184,0.18);background:rgba(0,229,184,0.04);">
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Name</td><td style="padding:12px 14px;color:#dce8f2;font-size:13px;text-align:right;">${escaped(input.name)}</td></tr>
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Email</td><td style="padding:12px 14px;color:#00e5b8;font-size:13px;text-align:right;"><a href="mailto:${escaped(input.email)}" style="color:#00e5b8;text-decoration:none;">${escaped(input.email)}</a></td></tr>
                  <tr><td style="padding:12px 14px;color:#3d5a72;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Received</td><td style="padding:12px 14px;color:#dce8f2;font-size:13px;text-align:right;">${escaped(received)}</td></tr>
                </table>
                <p style="margin:0 0 8px;color:#3d5a72;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">Message</p>
                <div style="margin:0 0 24px;padding:18px;border-left:2px solid #00e5b8;background:rgba(0,229,184,0.04);color:#dce8f2;font-size:14px;line-height:1.7;">${escaped(input.message).replace(/\r?\n/g, "<br>")}</div>
                <p style="margin:0 0 18px;color:#7a9ab5;font-size:13px;line-height:1.7;">Reply to this email to respond directly to the sender.</p>
                <p style="margin:0;"><a href="${escaped(adminUrl)}" style="display:inline-block;padding:12px 20px;background:#00e5b8;color:#04080d;font-size:13px;font-weight:bold;text-decoration:none;">Open admin inbox</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject: `New portfolio message from ${sender}`, text, html };
}

export async function sendOtpEmail(input: { to: string; code: string; purpose: OtpPurpose; minutes: number }) {
  if (!emailDeliveryConfigured()) {
    // Local development may run before email credentials are configured. The
    // code is logged to the server console and returned only to the local client.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[admin-otp] ${input.purpose} code for ${input.to}: ${input.code} (expires in ${input.minutes} minutes)`);
      return { developmentCode: input.code };
    }
    throw new EmailDeliveryError("Email delivery has not been configured. Add SMTP credentials, then try again.");
  }
  const message = messageFor(input.code, input.purpose, input.minutes);
  try {
    await deliver({ to: input.to, ...message });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // Development keeps working when the mail server is unreachable or the
      // credentials are wrong, so the code is shown locally instead.
      console.error("[admin-otp] email delivery failed, showing the code locally instead:", error instanceof Error ? error.message : "unknown error");
      console.info(`[admin-otp] ${input.purpose} code for ${input.to}: ${input.code} (expires in ${input.minutes} minutes)`);
      return { developmentCode: input.code };
    }
    throw error;
  }
  return {};
}

export async function sendLoginAlertEmail(input: {
  to: string;
  userAgent?: string | null;
  ip?: string;
  method?: "password" | "password-reset";
}) {
  if (!emailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[admin-security] sign-in alert for ${input.to} (email delivery not configured)`);
    return;
  }
  const message = loginAlertMessage({
    device: describeDevice(input.userAgent),
    ip: input.ip && input.ip !== "shared" ? input.ip : "Not available",
    when: istTimestamp(new Date()),
    method: input.method ?? "password"
  });
  await deliver({ to: input.to, ...message });
}

export async function sendContactNotificationEmail(input: {
  to: string;
  name: string;
  email: string;
  message: string;
  submittedAt: Date;
}) {
  if (!emailDeliveryConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[contact] message notification for ${input.to} (email delivery not configured)`);
    return;
  }
  await deliver({ to: input.to, replyTo: input.email, ...contactNotificationMessage(input) });
}
