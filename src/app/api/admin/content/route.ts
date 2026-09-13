import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { readPortfolio, writePortfolio, ContentConflictError } from "@/lib/content";
import { portfolioSchema } from "@/lib/content-schema";
import { assertSameOrigin, apiError, HttpError, json, readJson } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new HttpError(401, "Please sign in.");
    await rateLimit("admin-read", session.admin.id);
    return json(await readPortfolio());
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession();
    if (!session) throw new HttpError(401, "Your session has expired. Please sign in again.");
    await rateLimit("admin-write", session.admin.id);
    const data = portfolioSchema.parse(await readJson(request));
    const saved = await writePortfolio(data);
    revalidatePath("/");
    revalidatePath("/admin");
    return json(saved);
  } catch (error) {
    if (error instanceof ContentConflictError) return json({ error: error.message }, 409);
    return apiError(error);
  }
}
