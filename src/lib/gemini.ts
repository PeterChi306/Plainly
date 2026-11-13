import "server-only";
import type { ChatMessage, DocFile } from "./types";

// The key lives only on the server. Documents pass through to Gemini and
// are never written anywhere or logged.
const KEY = process.env.GEMINI_API_KEY ?? "";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}`;

export class ModelError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

const docParts = (files: DocFile[]) =>
  files.flatMap((f, i) => [
    { text: `Document ${i + 1}: ${f.name}` },
    { inline_data: { mime_type: f.type, data: f.data } },
  ]);

async function post(path: string, body: object) {
  if (!KEY) throw new ModelError("The server has no GEMINI_API_KEY yet.", 500);
  const response = await fetch(`${BASE}:${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    // Status only: the body can echo the request back.
    console.error(`gemini ${path} failed: HTTP ${response.status}`);
    throw new ModelError(
      response.status === 429 ? "Plainly is busy right now. Try again in a minute." : "The reader is unavailable right now.",
      response.status === 429 ? 429 : 502,
    );
  }
  return response;
}

/** One structured reading of the documents. */
export async function readDocuments(system: string, files: DocFile[], schema: object) {
  const response = await post("generateContent", {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [...docParts(files), { text: "Read these and answer in the required shape." }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
  });
  const json = await response.json();
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new ModelError("The reader didn't answer. Try again.");
  try {
    return JSON.parse(text);
  } catch {
    throw new ModelError("The reader answered in a shape we couldn't use. Try again.");
  }
}

/** Where the given quotes sit on one document's pages. Never throws: no boxes is fine. */
export async function locateQuotes(prompt: string, file: DocFile, schema: object) {
  try {
    const response = await post("generateContent", {
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: file.type, data: file.data } }, { text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const json = await response.json();
    const text: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const found = JSON.parse(text);
    return Array.isArray(found) ? (found as { quote: number; page: number; box_2d: number[] }[]) : [];
  } catch {
    return [];
  }
}

/** A chat turn, streamed back as plain text. */
export async function streamChat(system: string, files: DocFile[], messages: ChatMessage[]) {
  const contents = messages.map((m, i) => ({
    role: m.role,
    parts: i === 0 ? [...docParts(files), { text: m.text }] : [{ text: m.text }],
  }));
  const response = await post("streamGenerateContent?alt=sse", {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.4 },
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      buffer += done ? "\n" : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const chunk = JSON.parse(line.slice(5));
          const text = chunk?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // Not an event we can use (keep-alives and the like).
        }
      }
      if (done) controller.close();
    },
    cancel() {
      reader.cancel();
    },
  });
}
