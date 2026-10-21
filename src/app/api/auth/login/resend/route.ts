import { DatabaseUnavailableError } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json } from "@/lib/http";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { createOtp, deleteOtp, findOtp, maskEmail, OTP_TTL_SECONDS, readOtpToken, setOtpCookie } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailableError();
    await rateLimit("login-otp", clientAddress(request));
    const token = await readOtpToken("login");
    if (!token) throw new HttpError(400, "Your sign-in verification has expired. Please sign in again.");
    const record = await findOtp(token, "login");
    if (!record) throw new HttpError(410, "This verification code has expired. Please sign in again.");
    await rateLimit("otp-resend", record.adminId);

    const otp = await createOtp({
      adminId: record.adminId,
      email: record.email,
      purpose: "login",
      rememberMe: record.rememberMe
    });
    try {
      const delivery = await sendOtpEmail({ to: record.email, code: otp.code, purpose: "login", minutes: OTP_TTL_SECONDS / 60 });
      const response = json({
        ok: true,
        otpRequired: true,
        email: maskEmail(record.email),
        expiresIn: OTP_TTL_SECONDS,
        ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {})
      });
      setOtpCookie(response, "login", otp.token, otp.expiresAt);
      return response;
    } catch (error) {
      await deleteOtp(otp.id).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return json({ error: "Admin access will be available after the database is connected." }, 503);
    return apiError(error);
  }
}
