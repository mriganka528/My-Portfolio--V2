import { after } from "next/server";
import { getDb } from "@/lib/db";
import { contactSchema } from "@/lib/content-schema";
import { sendContactNotificationEmail } from "@/lib/email";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit("contact-address", clientAddress(request));
    const data = contactSchema.parse(await readJson(request, 24000));
    if (data.website) throw new HttpError(400, "Unable to send this message.");
    await rateLimit("contact-email", data.email);
    const db = getDb();
    const message = await db.contactMessage.create({ data: { name: data.name, email: data.email, message: data.message } });

    after(async () => {
      try {
        const admins = await db.admin.findMany({ select: { email: true } });
        for (const admin of admins) {
          await sendContactNotificationEmail({
            to: admin.email,
            name: data.name,
            email: data.email,
            message: data.message,
            submittedAt: message.createdAt
          }).catch(error => console.error(`Contact notification failed for ${admin.email}:`, error instanceof Error ? error.message : "Unknown error"));
        }
      } catch (error) {
        console.error("Contact notification lookup failed:", error instanceof Error ? error.message : "Unknown error");
      }
    });

    return json({ ok: true }, 201);
  } catch (error) { return apiError(error); }
}
