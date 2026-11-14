import { locateQuotes, readDocuments, ModelError } from "@/lib/gemini";
import { checkFiles, crossSite, notHere, outOfMessages, refund, spend, today } from "@/lib/guard";
import { MOCK_READING } from "@/lib/mock";
import { LANGUAGES } from "@/lib/modes";
import { locatePrompt, locateSchema, readPrompt, readingSchema } from "@/lib/prompts";
import { redactDeep } from "@/lib/redact";
import type { DocFile, ModeChoice, Reading, Spot } from "@/lib/types";

export const maxDuration = 60;

// Adds where each fact's and check's quote sits on the paper, so the page
// can highlight it. Pasted text is matched in the browser instead.
async function placeQuotes(reading: Reading, files: DocFile[]) {
  const items = [...reading.facts, ...reading.checks];
  items.forEach((item) => (item.where = []));
  const quotes = [...new Set(items.map((item) => item.source).filter(Boolean))];
  if (!reading.readable || quotes.length === 0) return;
  const prompt = locatePrompt(quotes);
  const found = await Promise.all(files.map((f) => (f.type === "text/plain" ? [] : locateQuotes(prompt, f, locateSchema))));
  const spots = new Map<string, Spot[]>();
  found.forEach((list, doc) =>
    list.forEach(({ quote, page, box_2d }) => {
      if (!quotes[quote] || box_2d?.length !== 4) return;
      spots.set(quotes[quote], [...(spots.get(quotes[quote]) ?? []), { doc: doc + 1, page: page || 1, box: box_2d }]);
    }),
  );
  items.forEach((item) => (item.where = spots.get(item.source) ?? []));
}

const CHOICES: ModeChoice[] = ["auto", "money", "legal", "assignment", "syllabus", "other"];

export async function POST(request: Request) {
  if (crossSite(request)) return notHere();
  const body = await request.json().catch(() => null);
  const files = checkFiles(body?.files);
  if (typeof files === "string") return Response.json({ error: files }, { status: 400 });

  const mode: ModeChoice = CHOICES.includes(body?.mode) ? body.mode : "auto";
  const language = LANGUAGES.some((l) => l.id === body?.language) ? body.language : "English";
  const question = typeof body?.question === "string" ? body.question.slice(0, 500) : "";

  const left = spend(request);
  if (left === null) return outOfMessages();
  const headers = { "X-Messages-Left": String(left) };

  if (process.env.PLAINLY_MOCK === "1") return Response.json({ reading: MOCK_READING }, { headers });

  try {
    const reading: Reading = await readDocuments(readPrompt(mode, language, today(), question), files, readingSchema);
    await placeQuotes(reading, files);
    return Response.json({ reading: redactDeep(reading) }, { headers });
  } catch (error) {
    refund(request);
    const status = error instanceof ModelError ? error.status : 500;
    const message = error instanceof ModelError ? error.message : "Something went wrong reading that.";
    return Response.json({ error: message }, { status });
  }
}
