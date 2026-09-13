import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, HttpError, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new HttpError(401, "Please sign in.");
    await rateLimit("admin-read", session.admin.id);
    const rawPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
    const page = Number.isSafeInteger(rawPage) ? Math.max(1, Math.min(rawPage, 100000)) : 1;
    const db = getDb();
    const [messages, total, unread] = await db.$transaction([
      db.contactMessage.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 }),
      db.contactMessage.count(),
      db.contactMessage.count({ where: { read: false } })
    ]);
    return json({ messages, total, unread, page, pages: Math.max(1, Math.ceil(total / 20)) });
  } catch (error) { return apiError(error); }
}
