"use client";

import { useEffect, useState } from "react";
import type { DocFile } from "./types";

const WIDTH = 1400;

// Draws each page of a PDF to an image ourselves, so it can sit on our paper
// with no viewer chrome around it. Stays in the browser like everything else.
export function usePdfPages(doc: DocFile, enabled: boolean) {
  const [pages, setPages] = useState<string[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let gone = false;
    const urls: string[] = [];
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const data = Uint8Array.from(atob(doc.data), (c) => c.charCodeAt(0));
      const pdf = await pdfjs.getDocument({ data }).promise;
      for (let n = 1; n <= Math.min(pdf.numPages, 30) && !gone; n++) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
        if (!blob || gone) break;
        urls.push(URL.createObjectURL(blob));
        setPages([...urls]);
      }
      pdf.cleanup();
    })().catch(() => !gone && setPages([]));
    return () => {
      gone = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [doc, enabled]);

  return enabled ? pages : null;
}
