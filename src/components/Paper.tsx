"use client";

import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  ArrowsOutSimpleIcon,
  FileTextIcon,
  HighlighterIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Doc, docText } from "@/lib/files";
import { useT } from "@/lib/i18n";
import { findQuote, type Mark } from "@/lib/marks";
import { usePdfPages } from "@/lib/usePdfPages";

/** Asks the paper to show one highlight. A new nonce asks again. */
export type Focus = { id: string; doc: number; nonce: number };

const MIN = 0.5;
const MAX = 5;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, z));

function useDocUrl(doc: Doc) {
  const url = useMemo(() => {
    if (doc.preview) return doc.preview;
    if (doc.type === "text/plain") return "";
    const bytes = Uint8Array.from(atob(doc.data), (c) => c.charCodeAt(0));
    return URL.createObjectURL(new Blob([bytes], { type: doc.type }));
  }, [doc]);
  useEffect(() => () => (url.startsWith("blob:") ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

type Gesture = Event & { scale: number; clientX: number; clientY: number };

// A highlighter stroke over the quoted words, a little wider than the box.
function Inks({ marks, page }: { marks: Mark[]; page: number }) {
  return marks
    .filter((m) => m.box && m.page === page)
    .map((m, i) => {
      const [y0, x0, y1, x1] = m.box!;
      return (
        <span
          key={`${m.id}-${i}`}
          data-mark={m.id}
          className={`ink ink-box ink-${m.ink}`}
          style={{ top: `${y0 / 10 - 0.4}%`, left: `${x0 / 10 - 0.6}%`, height: `${(y1 - y0) / 10 + 0.8}%`, width: `${(x1 - x0) / 10 + 1.2}%` }}
        />
      );
    });
}

// Pasted text has no page to box, so the quotes are found in the words.
function MarkedText({ text, marks }: { text: string; marks: Mark[] }) {
  const ranges = marks
    .map((m) => ({ m, at: findQuote(text, m.quote) }))
    .filter((r): r is { m: Mark; at: [number, number] } => r.at !== null)
    .sort((a, b) => a.at[0] - b.at[0])
    .filter((r, i, all) => i === 0 || r.at[0] >= all[i - 1].at[1]);
  const out: React.ReactNode[] = [];
  let from = 0;
  for (const { m, at } of ranges) {
    out.push(<Fragment key={`t${from}`}>{text.slice(from, at[0])}</Fragment>);
    out.push(
      <mark key={m.id} data-mark={m.id} className={`ink ink-${m.ink}`}>
        {text.slice(at[0], at[1])}
      </mark>,
    );
    from = at[1];
  }
  out.push(<Fragment key="end">{text.slice(from)}</Fragment>);
  return <>{out}</>;
}

// The paper itself, at a size you can actually read. Scroll to move down the
// page; pinch, ⌘/Ctrl-scroll, double-click or the buttons to zoom; drag to pan.
// Beside the answer it stays quiet: just the page. Full screen gets the tools.
function Stage({ doc, reading, simple, marks, focus }: { doc: Doc; reading: boolean; simple: boolean; marks: Mark[]; focus: Focus | null }) {
  const t = useT();
  const url = useDocUrl(doc);
  const pdf = doc.type === "application/pdf";
  const pages = usePdfPages(doc, pdf);
  const box = useRef<HTMLDivElement>(null);
  const shown = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [grabbing, setGrabbing] = useState(false);
  const current = useRef(1);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  // Zoom around a point on screen, so what's under your finger stays there.
  const zoomTo = useCallback((next: number, cx?: number, cy?: number) => {
    const el = box.current;
    const z = clamp(next);
    if (!el || Math.abs(z - current.current) < 0.001) return;
    const r = el.getBoundingClientRect();
    const ox = (cx ?? r.left + r.width / 2) - r.left;
    const oy = (cy ?? r.top + r.height / 2) - r.top;
    const k = z / current.current;
    pending.current = { x: (el.scrollLeft + ox) * k - ox, y: (el.scrollTop + oy) * k - oy };
    current.current = z;
    setZoom(z);
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    const p = pending.current;
    if (!el || !p) return;
    el.scrollLeft = p.x;
    el.scrollTop = p.y;
    pending.current = null;
  }, [zoom]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(current.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    };
    // Safari's trackpad pinch.
    let start = 1;
    const gStart = (e: Event) => {
      e.preventDefault();
      start = current.current;
    };
    const gChange = (e: Event) => {
      const g = e as Gesture;
      e.preventDefault();
      zoomTo(start * g.scale, g.clientX, g.clientY);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("gesturestart", gStart);
    el.addEventListener("gesturechange", gChange);
    return () => {
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("gesturestart", gStart);
      el.removeEventListener("gesturechange", gChange);
    };
  }, [zoomTo]);

  // Bring the asked-for highlight into view and make it blink, once it exists
  // (a PDF's pages arrive one by one).
  useEffect(() => {
    const el = box.current;
    if (!el || !focus || shown.current === focus.nonce) return;
    const found = el.querySelectorAll<HTMLElement>(`[data-mark="${focus.id}"]`);
    if (!found.length) return;
    shown.current = focus.nonce;
    found[0].scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    found.forEach((f) => {
      f.classList.remove("ink-flash");
      void f.offsetWidth;
      f.classList.add("ink-flash");
    });
  }, [focus, pages]);

  function down(e: React.PointerEvent) {
    const el = box.current!;
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: current.current };
      }
      return;
    }
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    setGrabbing(true);
  }

  function move(e: React.PointerEvent) {
    const el = box.current!;
    if (e.pointerType === "touch") {
      if (!touches.current.has(e.pointerId)) return;
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && touches.current.size === 2) {
        const [a, b] = [...touches.current.values()];
        zoomTo((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      return;
    }
    const d = drag.current;
    if (!d) return;
    el.scrollLeft = d.left - (e.clientX - d.x);
    el.scrollTop = d.top - (e.clientY - d.y);
  }

  function up(e: React.PointerEvent) {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    drag.current = null;
    setGrabbing(false);
  }

  const sheet =
    "relative overflow-hidden rounded-[6px] bg-white shadow-[0_24px_60px_-30px_rgba(40,22,10,0.55),0_2px_6px_-2px_rgba(40,22,10,0.2)]";

  return (
    <div className="group relative min-h-0 flex-1">
      <div
        ref={box}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={(e) => zoomTo(current.current > 1.05 ? 1 : 2.2, e.clientX, e.clientY)}
        className={`scroll-quiet absolute inset-0 touch-pan-x touch-pan-y overflow-auto rounded-[20px] ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div className="mx-auto space-y-5 px-5 py-6" style={{ width: `${zoom * 100}%` }}>
          {pdf ? (
            pages?.length ? (
              pages.map((src, i) => (
                <div key={src} className={`${sheet} rise`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={t.pageOf(doc.name, i + 1)} draggable={false} className="block w-full select-none" />
                  <Inks marks={marks} page={i + 1} />
                  {reading && i === 0 && <span className="scan" aria-hidden />}
                </div>
              ))
            ) : pages ? (
              <p className="py-20 text-center text-[13px] text-muted">
                {t.cantShowPdf}{" "}
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {t.openOriginal}
                  </a>
                )}
              </p>
            ) : (
              <div className={`${sheet} aspect-[8.5/11]`}>
                <span className="scan" aria-hidden />
              </div>
            )
          ) : (
            <div className={sheet}>
              {doc.type === "text/plain" ? (
                <p
                  className="whitespace-pre-wrap px-[7%] py-[8%] font-serif leading-relaxed text-[#2a211b]"
                  style={{ fontSize: 15 * zoom }}
                >
                  <MarkedText text={docText(doc)} marks={marks} />
                </p>
              ) : (
                url && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={doc.name} draggable={false} className="block w-full select-none" />
                    <Inks marks={marks} page={1} />
                  </>
                )
              )}
              {reading && <span className="scan" aria-hidden />}
            </div>
          )}
        </div>
      </div>

      <div
        className={`glass-strong absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center rounded-full p-1 text-ink-2 ring-1 ring-line transition-opacity duration-300 ${
          simple && zoom === 1 ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : ""
        }`}
      >
        <button
          onClick={() => zoomTo(current.current / 1.4)}
          className="rounded-full p-1.5 transition hover:bg-glass hover:text-ink"
          aria-label={t.zoomOut}
        >
          <MinusIcon size={14} />
        </button>
        <button
          onClick={() => zoomTo(1)}
          className="w-12 rounded-full py-1 text-center font-mono text-[11px] transition hover:text-ink"
          title={t.fit}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => zoomTo(current.current * 1.4)}
          className="rounded-full p-1.5 transition hover:bg-glass hover:text-ink"
          aria-label={t.zoomIn}
        >
          <PlusIcon size={14} />
        </button>
      </div>
    </div>
  );
}

type PanelProps = {
  docs: Doc[];
  reading?: boolean;
  side?: "left" | "right";
  onSide?: () => void;
  onExpand?: (page: number) => void;
  onClose?: () => void;
  start?: number;
  marks?: Mark[];
  focus?: Focus | null;
};

/** The documents beside the answer, or full screen. */
export function PaperPanel({ docs, reading = false, onSide, onExpand, onClose, start = 0, marks = [], focus = null }: PanelProps) {
  const t = useT();
  const [page, setPage] = useState(focus?.doc ?? start);
  const [inked, setInked] = useState(true);
  const [seen, setSeen] = useState(focus?.nonce);
  // Asked to show a highlight: turn to its paper, with highlights on.
  if (focus && focus.nonce !== seen) {
    setSeen(focus.nonce);
    setPage(focus.doc);
    setInked(true);
  }
  const index = Math.min(page, docs.length - 1);
  const doc = docs[index];
  const here = marks.filter((m) => m.doc === index);
  const original = useDocUrl(doc);

  return (
    <div className="glass-strong flex h-full min-h-0 flex-col rounded-[28px] p-2 ring-1 ring-line">
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        {docs.length > 1 ? (
          <div className="scroll-quiet flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {docs.map((d, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3 text-[12px] transition ${
                  i === page ? "bg-glass text-ink ring-1 ring-line" : "text-muted hover:text-ink"
                }`}
              >
                <FileTextIcon size={15} weight="duotone" className={i === page ? "text-accent" : ""} />
                <span className="max-w-[140px] truncate font-mono text-[10.5px]">{d.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="min-w-0 flex-1 truncate pl-1 font-mono text-[11px] text-muted">{doc.name}</p>
        )}
        {marks.length > 0 && (
          <button
            onClick={() => setInked((v) => !v)}
            className={`rounded-full p-1.5 transition hover:bg-glass ${inked ? "text-accent" : "text-muted hover:text-ink"}`}
            aria-label={inked ? t.marksHide : t.marksShow}
            aria-pressed={inked}
            title={inked ? t.marksHide : t.marksShow}
          >
            <HighlighterIcon size={16} weight={inked ? "duotone" : "regular"} />
          </button>
        )}
        {onClose && doc.type === "application/pdf" && original && (
          <a
            href={original}
            target="_blank"
            rel="noreferrer"
            className="rounded-full p-1.5 text-muted transition hover:bg-glass hover:text-ink"
            aria-label={t.openOriginal}
            title={t.openOriginal}
          >
            <ArrowSquareOutIcon size={16} />
          </a>
        )}
        {onSide && (
          <button
            onClick={onSide}
            className="rounded-full p-1.5 text-muted transition hover:bg-glass hover:text-ink"
            aria-label={t.switchSides}
            title={t.switchSides}
          >
            <ArrowsLeftRightIcon size={16} />
          </button>
        )}
        {onExpand && (
          <button
            onClick={() => onExpand(page)}
            className="rounded-full p-1.5 text-muted transition hover:bg-glass hover:text-ink"
            aria-label={t.fullScreen}
            title={t.fullScreen}
          >
            <ArrowsOutSimpleIcon size={16} />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-2 transition hover:bg-glass hover:text-ink" aria-label={t.close}>
            <XIcon size={17} />
          </button>
        )}
      </div>
      <div className={`flex min-h-0 flex-1 flex-col ${inked ? "" : "inks-off"}`}>
        <Stage key={index} doc={doc} reading={reading} simple={!onClose} marks={here} focus={focus?.doc === index ? focus : null} />
      </div>
    </div>
  );
}

export function Viewer({ docs, start, onClose, marks, focus }: { docs: Doc[]; start: number; onClose: () => void; marks?: Mark[]; focus?: Focus | null }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/35 p-3 backdrop-blur-md sm:p-6" onClick={onClose}>
      <div className="pop mx-auto h-full max-w-[1100px]" onClick={(e) => e.stopPropagation()}>
        <PaperPanel docs={docs} start={start} onClose={onClose} marks={marks} focus={focus} />
      </div>
    </div>
  );
}
