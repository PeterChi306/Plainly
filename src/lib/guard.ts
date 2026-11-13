import "server-only";
import { DAILY_MESSAGES as DAILY } from "./modes";
import type { DocFile } from "./types";

// Vercel refuses bodies over 4.5 MB, so the page shrinks photos first and
// the server holds to a little under that.
export const MAX_BYTES = 4_200_000;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf", "text/plain"];

export function checkFiles(files: unknown): DocFile[] | string {
  if (!Array.isArray(files) || files.length === 0) return "Add a document first.";
  if (files.length > 4) return "Up to 4 documents at a time.";
  let total = 0;
  for (const f of files) {
    if (!f || typeof f.data !== "string" || typeof f.type !== "string" || typeof f.name !== "string") {
      return "One of the files didn't come through. Try adding it again.";
    }
    if (!TYPES.includes(f.type)) return `${f.name} isn't a photo or PDF.`;
    total += f.data.length * 0.75;
  }
  if (total > MAX_BYTES) return "These files are too big together. Try fewer pages or smaller photos.";
  return files as DocFile[];
}

// Each visitor gets a few messages a day: a reading and a follow-up
// question both count as one. It lives in memory, so it's per server
// instance and resets when one starts; enough to stop casual abuse.
const DAY = 86_400_000;
const sent = new Map<string, number[]>();

const visitor = (request: Request) =>
  request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

/** Uses one of today's messages. Returns how many are left, or null if none were. */
export function spend(request: Request): number | null {
  const key = visitor(request);
  const now = Date.now();
  const recent = (sent.get(key) ?? []).filter((t) => now - t < DAY);
  if (recent.length >= DAILY) {
    sent.set(key, recent);
    return null;
  }
  recent.push(now);
  sent.set(key, recent);
  return DAILY - recent.length;
}

/** Gives a message back when the reader failed, so errors don't cost one. */
export function refund(request: Request) {
  sent.get(visitor(request))?.pop();
}

export const outOfMessages = () =>
  Response.json({ error: `That's all ${DAILY} messages for today. Come back tomorrow.`, code: "limit" }, { status: 429 });

export function today() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}
