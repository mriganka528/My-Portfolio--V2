import { getDb } from "@/lib/db";
import { contactSchema } from "@/lib/content-schema";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await rateLimit("contact-address", clientAddress(request));
    const data = contactSchema.parse(await readJson(request, 24000));
    if (data.website) throw new HttpError(400, "Unable to send this message.");
    await rateLimit("contact-email", data.email);
    await getDb().contactMessage.create({ data: { name: data.name, email: data.email, message: data.message } });
    return json({ ok: true }, 201);
  } catch (error) { return apiError(error); }
}
