import { getSession } from "@/lib/auth";
import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { otpVerifySchema } from "@/lib/content-schema";
import { rateLimit } from "@/lib/rate-limit";
import { checkOtpCode, clearOtpCookie, findOtp, readOtpToken } from "@/lib/otp";

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    const session = await getSession();
    if (!session) throw new HttpError(401, "Your session has expired. Please sign in again.");
    await rateLimit("admin-settings", session.admin.id);
    const token = await readOtpToken("settings");
    if (!token) throw new HttpError(400, "Your verification request has expired. Start again.");
    const record = await findOtp(token, "settings-email");
    if (!record || record.adminId !== session.admin.id) throw new HttpError(410, "This verification code has expired. Start again.");
    const { code } = otpVerifySchema.parse(await readJson(request, 2048));
    await checkOtpCode(record, code);

    const db = getDb();
    try {
      await db.$transaction([
        db.admin.update({ where: { id: session.admin.id }, data: { email: record.email } }),
        db.session.deleteMany({ where: { adminId: session.admin.id, id: { not: session.id } } }),
        db.adminOtp.deleteMany({ where: { adminId: session.admin.id } })
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "That email address is already in use.");
      throw error;
    }

    const response = json({ ok: true, email: record.email });
    clearOtpCookie(response, "settings");
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
