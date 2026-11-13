import type { DocFile } from "./types";

/** A document in the page: what's sent, plus a preview to show. */
export type Doc = DocFile & { preview: string | null };

const LONG_EDGE = 2000;

export class NotADocument extends Error {
  constructor(public file: string) {
    super(`${file} isn't a photo or PDF.`);
  }
}

// Phone photos are several MB; a 2000px JPEG keeps small print readable
// at a fraction of that, and stays under the server's body limit.
async function shrinkImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

const readAsDataURL = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export async function toDoc(file: File): Promise<Doc> {
  if (file.type === "application/pdf") {
    const url = await readAsDataURL(file);
    return { name: file.name, type: "application/pdf", data: url.split(",")[1], preview: null };
  }
  if (file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)) {
    try {
      const url = await shrinkImage(file);
      return { name: file.name, type: "image/jpeg", data: url.split(",")[1], preview: url };
    } catch {
      // Browsers that can't decode HEIC: send it as is.
      const url = await readAsDataURL(file);
      return { name: file.name, type: file.type || "image/heic", data: url.split(",")[1], preview: null };
    }
  }
  throw new NotADocument(file.name);
}

export async function fetchDoc(url: string, name: string): Promise<Doc> {
  const blob = await (await fetch(url)).blob();
  return toDoc(new File([blob], name, { type: blob.type }));
}

export const docBytes = (docs: Doc[]) => docs.reduce((sum, d) => sum + d.data.length * 0.75, 0);

/** Pasted text, sent as a plain-text document. */
export function textDoc(text: string): Doc {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return { name: "Pasted text", type: "text/plain", data: btoa(binary), preview: null };
}

/** The words inside a pasted-text document. */
export function docText(doc: DocFile) {
  return new TextDecoder().decode(Uint8Array.from(atob(doc.data), (c) => c.charCodeAt(0)));
}
