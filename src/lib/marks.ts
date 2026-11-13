import type { Reading, Spot, Tone, Verdict } from "./types";

// The quotes behind facts and checks, as highlights on the paper. Each
// takes the color of what Plainly found there.
export type Ink = "alert" | "warn" | "ok" | "note";
export type Mark = { id: string; quote: string; ink: Ink; doc: number; page: number; box: [number, number, number, number] | null };

const TONE_INK: Record<Tone, Ink> = { bad: "alert", warn: "warn", good: "ok", neutral: "note" };
const VERDICT_INK: Record<Verdict, Ink> = { alert: "alert", warn: "warn", ok: "ok", info: "note" };

function spots(id: string, quote: string, ink: Ink, where: Spot[] | undefined): Mark[] {
  if (!quote) return [];
  const boxed = (where ?? [])
    .filter((w) => Array.isArray(w.box) && w.box.length === 4 && w.box[2] > w.box[0] && w.box[3] > w.box[1])
    .map((w) => ({ id, quote, ink, doc: Math.max(0, (w.doc || 1) - 1), page: Math.max(1, w.page || 1), box: w.box.map((n) => Math.min(1000, Math.max(0, n))) as Mark["box"] }));
  // No box (pasted text, or the model left it out): the words are found by matching instead.
  return boxed.length ? boxed : [{ id, quote, ink, doc: Math.max(0, ((where ?? [])[0]?.doc || 1) - 1), page: 1, box: null }];
}

export function marksOf(r: Reading): Mark[] {
  return [
    ...r.facts.flatMap((f, i) => spots(`fact-${i}`, f.source, TONE_INK[f.tone], f.where)),
    ...r.checks.flatMap((c, i) => spots(`check-${i}`, c.source, VERDICT_INK[c.verdict], c.where)),
  ];
}

/** Where a quote sits in plain text, ignoring case, spacing and punctuation. */
export function findQuote(text: string, quote: string): [number, number] | null {
  const keep = (c: string) => /[\p{L}\p{N}]/u.test(c);
  const map: number[] = [];
  let flat = "";
  for (let i = 0; i < text.length; i++) {
    if (keep(text[i])) {
      flat += text[i].toLowerCase();
      map.push(i);
    }
  }
  const needle = [...quote].filter(keep).join("").toLowerCase();
  if (needle.length < 3) return null;
  const at = flat.indexOf(needle);
  if (at < 0) return null;
  return [map[at], map[at + needle.length - 1] + 1];
}
