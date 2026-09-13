import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new HttpError(401, "Please sign in.");
    await rateLimit("admin-write", session.admin.id);
    const { id } = await context.params;
    const data = z.object({ read: z.boolean() }).parse(await readJson(request, 1024));
    const result = await getDb().contactMessage.updateMany({ where: { id }, data });
    if (!result.count) throw new HttpError(404, "Message not found.");
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new HttpError(401, "Please sign in.");
    await rateLimit("admin-write", session.admin.id);
    const { id } = await context.params;
    await getDb().contactMessage.deleteMany({ where: { id } });
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
