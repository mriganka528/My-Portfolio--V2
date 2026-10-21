import { DatabaseUnavailableError, getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { otpVerifySchema } from "@/lib/content-schema";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { checkOtpCode, findOtp, OTP_TTL_SECONDS, readOtpToken, setOtpCookie } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    await rateLimit("forgot-otp", clientAddress(request));
    const token = await readOtpToken("reset");
    if (!token) throw new HttpError(400, "Your reset request has expired. Enter your email again.");
    const record = await findOtp(token, "password-reset");
    if (!record) throw new HttpError(410, "This verification code has expired. Enter your email again.");
    const { code } = otpVerifySchema.parse(await readJson(request, 2048));
    await checkOtpCode(record, code);

    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    await getDb().adminOtp.update({
      where: { id: record.id },
      data: { verifiedAt: new Date(), attempts: 0, expiresAt }
    });
    const response = json({ ok: true });
    setOtpCookie(response, "reset", token, expiresAt);
    return response;
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
