import { getSession } from "@/lib/auth";
import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { otpVerifySchema } from "@/lib/content-schema";
import { rateLimit } from "@/lib/rate-limit";
import { checkOtpCode, clearOtpCookie, findOtp, readOtpToken } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const session = await getSession();
    if (!session) throw new HttpError(401, "Your session has expired. Please sign in again.");
    await rateLimit("admin-settings", session.admin.id);
    const token = await readOtpToken("settings");
    if (!token) throw new HttpError(400, "Your verification request has expired. Start again.");
    const record = await findOtp(token, "settings-password");
    if (!record || record.adminId !== session.admin.id) throw new HttpError(410, "This verification code has expired. Start again.");
    if (!record.pendingPasswordHash) throw new HttpError(400, "Your verification request is incomplete. Start again.");
    const { code } = otpVerifySchema.parse(await readJson(request, 2048));
    await checkOtpCode(record, code);

    const db = getDb();
    await db.$transaction([
      db.admin.update({ where: { id: session.admin.id }, data: { passwordHash: record.pendingPasswordHash } }),
      db.session.deleteMany({ where: { adminId: session.admin.id, id: { not: session.id } } }),
      db.adminOtp.deleteMany({ where: { adminId: session.admin.id } })
    ]);

    const response = json({ ok: true, email: session.admin.email });
    clearOtpCookie(response, "settings");
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
