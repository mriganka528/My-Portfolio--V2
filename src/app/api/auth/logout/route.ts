import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { hashToken } from "@/lib/password";
import { assertSameOrigin, apiError, json } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token && process.env.DATABASE_URL?.trim()) await getDb().session.deleteMany({ where: { tokenHash: hashToken(token) } });
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
    return response;
  } catch (error) { return apiError(error); }
}
