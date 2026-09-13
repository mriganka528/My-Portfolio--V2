import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class RateLimitError extends HttpError {
  constructor(public retryAfterSeconds: number) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    super(429, `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || (process.env.NODE_ENV !== "production" ? new URL(request.url).origin : "");
  if (!expected) throw new HttpError(503, "The application URL has not been configured.");
  if (!origin || origin !== new URL(expected).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "This request is not allowed.");
  }
}

export async function readJson(request: Request, maxBytes = 256 * 1024): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError(415, "Expected JSON.");
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new HttpError(413, "Request too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request too large."); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON.");
  } finally { reader.releaseLock(); }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(error: unknown) {
  if (error instanceof RateLimitError) {
    const response = json({ error: error.message, retryAfterSeconds: error.retryAfterSeconds }, 429);
    response.headers.set("Retry-After", String(error.retryAfterSeconds));
    return response;
  }
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(" ") }, 400);
  console.error("Server request failed:", error instanceof Error ? error.name : "Unknown error");
  return json({ error: "Service temporarily unavailable. Please try again later." }, 503);
}
