import { streamChat, ModelError } from "@/lib/gemini";
import { checkFiles, crossSite, notHere, outOfMessages, refund, spend, today } from "@/lib/guard";
import { LANGUAGES } from "@/lib/modes";
import { chatPrompt } from "@/lib/prompts";
import type { ChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (crossSite(request)) return notHere();
  const body = await request.json().catch(() => null);
  const files = checkFiles(body?.files);
  if (typeof files === "string") return Response.json({ error: files }, { status: 400 });

  const messages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages
        .filter((m: ChatMessage) => (m?.role === "user" || m?.role === "model") && typeof m.text === "string")
        .slice(-20)
        .map((m: ChatMessage) => ({ role: m.role, text: m.text.slice(0, 4000) }))
    : [];
  if (messages.length === 0 || messages[0].role !== "user" || messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Ask a question first." }, { status: 400 });
  }
  const language = LANGUAGES.some((l) => l.id === body?.language) ? body.language : "English";
  const reading = JSON.stringify(body?.reading ?? {}).slice(0, 12000);

  const left = spend(request);
  if (left === null) return outOfMessages();

  try {
    const stream = await streamChat(chatPrompt(language, today(), reading), files, messages);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Messages-Left": String(left) },
    });
  } catch (error) {
    refund(request);
    const status = error instanceof ModelError ? error.status : 500;
    const message = error instanceof ModelError ? error.message : "Something went wrong.";
    return Response.json({ error: message }, { status });
  }
}
