import { cookies } from "next/headers";
import { getDb, DatabaseUnavailableError } from "@/lib/db";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/password";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    await rateLimit("login-address", clientAddress(request));
    const { email, password, rememberMe } = loginSchema.parse(await readJson(request, 4096));
    await rateLimit("login-email", email);
    const admin = await getDb().admin.findUnique({ where: { email } });
    const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !valid) throw new HttpError(401, "Incorrect email or password.");
    const previous = (await cookies()).get(SESSION_COOKIE)?.value;
    const session = await createSession(admin.id, rememberMe, previous);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, session.token, { ...sessionCookieOptions, expires: session.expiresAt, maxAge: session.maxAge });
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
