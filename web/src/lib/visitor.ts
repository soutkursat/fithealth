import "server-only";
import { createHash } from "node:crypto";

/** Anonymous, salted hash of the visitor's IP — only used for rate limiting. */
export function visitorHash(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.SYNC_TOKEN ?? "kurt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function sinceIso(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}
