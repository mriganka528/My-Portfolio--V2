import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "./db";
import { hashToken } from "./password";
import { sessionLifetime } from "./session-policy";

export const SESSION_COOKIE = "portfolio_admin_session";
export const sessionCookieOptions = {
  httpOnly: true, sameSite: "strict" as const, secure: process.env.NODE_ENV === "production", path: "/"
};

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-zA-Z0-9_-]{43}$/.test(token) || !process.env.DATABASE_URL?.trim()) return null;
  const session = await getDb().session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, admin: { select: { id: true, email: true } } }
  });
  return session && session.expiresAt > new Date() ? session : null;
});

export async function createSession(adminId: string, rememberMe: boolean, previousToken?: string) {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const maxAge = sessionLifetime(rememberMe);
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  await db.$transaction([
    db.session.deleteMany({ where: { OR: [
      { expiresAt: { lte: new Date() } },
      ...(previousToken ? [{ tokenHash: hashToken(previousToken) }] : [])
    ] } }),
    db.session.create({ data: { tokenHash: hashToken(token), adminId, expiresAt } })
  ]);
  return { token, expiresAt, maxAge };
}
