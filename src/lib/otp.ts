import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getDb } from "./db";
import { HttpError } from "./http";
import { hashPassword, hashToken, verifyPassword } from "./password";
import type { OtpPurpose } from "./email";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_COOKIE_NAMES = {
  login: "portfolio_admin_login_otp",
  reset: "portfolio_admin_reset_otp",
  settings: "portfolio_admin_settings_otp"
} as const;

export type OtpFlow = keyof typeof OTP_COOKIE_NAMES;

export const otpCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: OTP_TTL_SECONDS
};

export function setOtpCookie(response: NextResponse, flow: OtpFlow, token: string, expiresAt: Date) {
  response.cookies.set(OTP_COOKIE_NAMES[flow], token, { ...otpCookieOptions, expires: expiresAt });
}

export function clearOtpCookie(response: NextResponse, flow: OtpFlow) {
  response.cookies.set(OTP_COOKIE_NAMES[flow], "", { ...otpCookieOptions, maxAge: 0, expires: new Date(0) });
}

export async function readOtpToken(flow: OtpFlow) {
  const token = (await cookies()).get(OTP_COOKIE_NAMES[flow])?.value;
  return token && /^[a-zA-Z0-9_-]{43}$/.test(token) ? token : null;
}

export async function createOtp(input: {
  adminId: string;
  email: string;
  purpose: OtpPurpose;
  rememberMe?: boolean;
  pendingPasswordHash?: string;
}) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const token = randomBytes(32).toString("base64url");
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  const db = getDb();
  const created = await db.$transaction(async transaction => {
    await transaction.adminOtp.deleteMany({ where: { adminId: input.adminId, purpose: input.purpose } });
    await transaction.adminOtp.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return transaction.adminOtp.create({
      data: {
        tokenHash: hashToken(token),
        adminId: input.adminId,
        email: input.email,
        purpose: input.purpose,
        codeHash,
        rememberMe: input.rememberMe ?? false,
        pendingPasswordHash: input.pendingPasswordHash,
        expiresAt
      }
    });
  });
  return { id: created.id, code, token, expiresAt };
}

export async function findOtp(token: string | null, purpose: OtpPurpose) {
  if (!token) return null;
  return getDb().adminOtp.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: { select: { id: true, email: true } } }
  }).then(record => record?.purpose === purpose ? record : null);
}

export async function checkOtpCode(record: NonNullable<Awaited<ReturnType<typeof findOtp>>>, code: string) {
  const db = getDb();
  if (record.expiresAt <= new Date()) {
    await db.adminOtp.deleteMany({ where: { id: record.id } });
    throw new HttpError(410, "This verification code has expired. Request a new code.");
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await db.adminOtp.deleteMany({ where: { id: record.id } });
    throw new HttpError(429, "Too many incorrect codes. Request a new code.");
  }
  if (!await verifyPassword(code, record.codeHash)) {
    const attempts = record.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) await db.adminOtp.deleteMany({ where: { id: record.id } });
    else await db.adminOtp.update({ where: { id: record.id }, data: { attempts } });
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - attempts);
    throw new HttpError(401, remaining
      ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
      : "Too many incorrect codes. Request a new code.");
  }
  return record;
}

export async function deleteOtp(id: string) {
  await getDb().adminOtp.deleteMany({ where: { id } });
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(2, Math.min(6, local.length - visible.length)))}@${domain}`;
}
