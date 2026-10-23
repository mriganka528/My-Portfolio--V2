import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, HttpError, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new HttpError(401, "Please sign in.");
    await rateLimit("admin-read", session.admin.id);
    const unread = await getDb().contactMessage.count({ where: { read: false } });
    return json({ unread });
  } catch (error) { return apiError(error); }
}
