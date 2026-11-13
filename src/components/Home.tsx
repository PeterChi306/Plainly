"use client";

import { ArrowUpIcon, CameraIcon, FilePdfIcon, MicrophoneIcon, PaperclipIcon, PlusIcon, StopIcon, TextAaIcon, XIcon } from "@phosphor-icons/react";
import { BorderBeam } from "border-beam";
import Image from "next/image";
import { type DragEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { type Doc, docText, NotADocument, textDoc, toDoc } from "@/lib/files";
import { type Dict, useT } from "@/lib/i18n";
import { DAILY_MESSAGES } from "@/lib/modes";
import { SAMPLES } from "@/lib/samples";
import type { ModeChoice } from "@/lib/types";
import { useTheme } from "@/lib/useTheme";
import { useVoice } from "@/lib/useVoice";
import { ModeIcon } from "./ModeIcon";
import { Glow } from "./Glow";
import { ModePicker } from "./ModePicker";

const noop = () => () => {};

function partOfDay(): keyof Dict["greetings"] {
  const h = new Date().getHours();
  return h < 5 ? "evening" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

// Pasted text this long is treated as the document itself.
const PASTED_DOC = 160;

type Staged = Doc & { key: string };

type Props = {
  mode: ModeChoice;
  language: string;
  left: number | null;
  onMode: (mode: ModeChoice) => void;
  onRead: (docs: Doc[], question: string) => void;
  onSample: (id: string) => void;
};

export function Home({ mode, language, left, onMode, onRead, onSample }: Props) {
  const t = useT();
  const hello = t.greetings[useSyncExternalStore(noop, partOfDay, () => "hello" as const)];
  const { dark } = useTheme();
  const [staged, setStaged] = useState<Staged[]>([]);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const depth = useRef(0);
  const desk = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const snap = useRef<HTMLInputElement>(null);
  const voice = useVoice(language, setText);

  async function add(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    setNote(null);
    try {
      const docs = await Promise.all(Array.from(list).map(toDoc));
      setStaged((s) => [...s, ...docs.map((d) => ({ ...d, key: crypto.randomUUID() }))].slice(0, 4));
    } catch (e) {
      setNote(e instanceof NotADocument ? t.notADoc(e.file) : t.cantOpen);
    }
  }

  function submit() {
    const words = text.trim();
    if (voice.listening) voice.stop();
    if (staged.length > 0) {
      onRead(staged, words);
    } else if (words.length >= PASTED_DOC) {
      onRead([textDoc(words)], "");
    } else {
      setNote(words ? t.needPaper : t.needAnything);
    }
  }

  // Pasting a screenshot works too, and files dropped beside the desk
  // shouldn't make the browser open them.
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        addRef.current(files);
      }
    };
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener("paste", onPaste);
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const drag = {
    onDragEnter(e: DragEvent) {
      if (!e.dataTransfer.types.includes("Files")) return;
      depth.current += 1;
      setDragging(true);
    },
    onDragOver(e: DragEvent) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave() {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop(e: DragEvent) {
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const box = desk.current?.getBoundingClientRect();
      if (box) {
        const ripple = { id: Date.now(), x: e.clientX - box.left, y: e.clientY - box.top };
        setRipples((r) => [...r, ripple]);
        setTimeout(() => setRipples((r) => r.filter((x) => x.id !== ripple.id)), 1200);
      }
      add(e.dataTransfer.files);
    },
  };

  const ready = staged.length > 0 || text.trim().length >= PASTED_DOC;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col px-4 pb-16 pt-[12vh] sm:px-6 md:pt-[17vh]">
      <div className="rise text-center">
        <p className="font-script text-[44px] leading-none text-accent sm:text-[54px]">{hello}</p>
        <h1 className="mt-1 font-serif text-[40px] leading-[1.05] tracking-tight text-ink sm:text-[58px]">
          {t.title[0]} <span className="italic">{t.title[1]}</span>
        </h1>
      </div>

      <div className="rise mt-10 [animation-delay:80ms]">
        <BorderBeam size="md" colorVariant="sunset" theme={dark ? "dark" : "light"} active={dragging} borderRadius={30} strength={1} brightness={1.6}>
          <Glow stream={voice.stream} listening={voice.listening}>
            <div
              ref={desk}
              {...drag}
              className={`glass-strong relative rounded-[30px] ring-1 ring-line transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.25,1.1)] ${dragging ? "scale-[1.02]" : ""}`}
              style={{ minHeight: dragging ? 360 : 0 }}
            >
              {/* Its own clipped layer, so the mode list can still open past the edge. */}
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
                {ripples.map((r) => (
                  <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
                ))}
              </span>

              {dragging && <DropInvite count={staged.length} t={t} />}

              <div className={`transition-opacity duration-300 ${dragging ? "opacity-0" : "opacity-100"}`}>
                {staged.length > 0 && (
                  <Papers t={t} docs={staged} onRemove={(key) => setStaged((s) => s.filter((d) => d.key !== key))} onAdd={() => pick.current?.click()} />
                )}

                <textarea
                  ref={field}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setNote(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={2}
                  placeholder={
                    voice.listening ? t.listening : staged.length ? t.placeholderStaged : t.placeholderEmpty
                  }
                  className={`block max-h-[220px] w-full resize-none bg-transparent px-6 pt-5 text-[16px] leading-relaxed text-ink outline-none placeholder:text-muted ${staged.length ? "min-h-[56px]" : "min-h-[92px]"}`}
                />

                <div className="flex items-center gap-1 px-3 pb-3 pt-2">
                  <button
                    onClick={() => pick.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-glass hover:text-ink"
                    aria-label={t.addFile}
                    title={t.addFile}
                  >
                    <PaperclipIcon size={19} weight="duotone" />
                  </button>
                  <button
                    onClick={() => snap.current?.click()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition hover:bg-glass hover:text-ink sm:hidden"
                    aria-label={t.takePhoto}
                  >
                    <CameraIcon size={19} weight="duotone" />
                  </button>
                  <span className="mx-1 h-5 w-px bg-line-strong" />
                  <ModePicker mode={mode} onMode={onMode} />

                  <div className="ml-auto flex items-center gap-1.5">
                    {text.trim().length >= PASTED_DOC && staged.length === 0 && (
                      <span className="pop mr-1 hidden items-center gap-1 font-mono text-[10.5px] text-muted sm:flex">
                        <TextAaIcon size={13} weight="duotone" />
                        {t.readingPasted}
                      </span>
                    )}
                    {voice.supported && (
                      <button
                        onClick={voice.toggle}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition ${voice.listening ? "bg-ink text-bg" : "text-ink-2 hover:bg-glass hover:text-ink"}`}
                        aria-label={voice.listening ? t.stopListening : t.speak}
                      >
                        {voice.listening ? <StopIcon size={15} weight="fill" /> : <MicrophoneIcon size={19} weight="duotone" />}
                      </button>
                    )}
                    <button
                      onClick={submit}
                      className={`flex h-9 items-center gap-1.5 rounded-full transition ${ready ? "bg-accent px-4 text-on-accent shadow-[0_8px_22px_-10px_var(--accent)] hover:brightness-110" : "w-9 justify-center bg-line-strong text-muted"}`}
                      aria-label={t.readIt}
                    >
                      {ready && <span className="pop text-[13px] font-medium">{t.readIt}</span>}
                      <ArrowUpIcon size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Glow>
        </BorderBeam>
        <p
          className={`mt-3 text-center text-[12.5px] transition ${note ? "text-alert" : left !== null && left <= 2 ? "text-muted" : "text-transparent"}`}
          aria-live="polite"
        >
          {note ?? (left === 0 ? t.noneLeft : left !== null && left <= 2 ? t.left(left, DAILY_MESSAGES) : "·")}
        </p>
      </div>

      <input
        ref={pick}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={snap}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="rise mt-8 [animation-delay:160ms]">
        <p className="label mb-3 text-center">{t.tryAsking}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {t.tryList.map((q) => (
            <button
              key={q}
              onClick={() => {
                setText(q);
                field.current?.focus();
              }}
              className="glass rounded-full px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:text-ink"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="rise mt-10 [animation-delay:220ms]">
        <p className="label mb-3 text-center">{t.orSample}</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => onSample(s.id)}
              className="group glass flex flex-col items-start overflow-hidden rounded-2xl text-left transition hover:-translate-y-0.5"
            >
              <span className="relative block h-24 w-full overflow-hidden bg-white">
                <Image
                  src={s.files[0].url}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover object-top opacity-90 transition duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--glass-strong)] to-transparent" />
              </span>
              <span className="px-3 pb-3 pt-2">
                <span className="flex items-center gap-1.5 text-[13px] text-ink">
                  <span className="text-accent">
                    <ModeIcon mode={s.mode} size={14} />
                  </span>
                  {t.samples[s.id]?.title ?? s.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted">{t.samples[s.id]?.hint ?? s.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// While a file hovers: the stack on the desk lifts and fans open, ready.
function DropInvite({ count, t }: { count: number; t: Dict }) {
  return (
    <div className="pop pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
      <div className="lift relative h-[120px] w-[200px]">
        {[-14, -2, 11].map((deg, i) => (
          <span
            key={deg}
            className="absolute left-1/2 top-2 h-[104px] w-[80px] rounded-[10px] bg-white shadow-[0_18px_40px_-16px_rgba(60,40,20,0.55)] ring-1 ring-black/5"
            style={{ transform: `translateX(-50%) translateX(${deg * 3.4}px) translateY(${i === 1 ? -10 : 0}px) rotate(${deg}deg)` }}
          >
            <span className="absolute left-3 right-3 top-4 h-[3px] rounded-full bg-[#e9dfcf]" />
            <span className="absolute left-3 right-6 top-7 h-[3px] rounded-full bg-[#e9dfcf]" />
            <span className="absolute left-3 right-4 top-10 h-[3px] rounded-full bg-[#e9dfcf]" />
            {i === 1 && <span className="absolute bottom-4 left-3 h-[3px] w-6 rounded-full bg-accent/70" />}
          </span>
        ))}
      </div>
      <p className="mt-6 font-serif text-[28px] italic leading-none text-ink">{t.dropLetGo}</p>
      <p className="label mt-2.5">{count ? t.dropAdding : t.dropKinds}</p>
    </div>
  );
}

const REST = [-4, 3, -2, 5];

// What's been added, laid out like papers taped to the desk.
function Papers({ docs, onRemove, onAdd, t }: { docs: Staged[]; onRemove: (key: string) => void; onAdd: () => void; t: Dict }) {
  return (
    <div className="flex items-end gap-4 overflow-x-auto px-6 pb-2 pt-7 [scrollbar-width:none] sm:gap-5">
      {docs.map((d, i) => (
        <figure
          key={d.key}
          className="settle group relative shrink-0"
          style={{ ["--rest" as string]: `${REST[i % REST.length]}deg`, animationDelay: `${i * 60}ms` }}
        >
          <div className="relative h-[176px] w-[136px] overflow-hidden rounded-[8px] bg-white shadow-[0_22px_40px_-22px_rgba(50,30,15,0.65),0_2px_6px_-2px_rgba(50,30,15,0.18)] sm:h-[200px] sm:w-[154px]">
            {d.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.preview} alt={d.name} className="h-full w-full object-cover object-top" />
            ) : d.type === "text/plain" ? (
              <TextPaper doc={d} />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#8a5a36]">
                <FilePdfIcon size={44} weight="duotone" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#9b9086]">PDF</span>
              </span>
            )}
            {/* The page's own soft curl of light. */}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_60%,rgba(0,0,0,0.05))]" />
          </div>
          {/* A strip of tape holding it down. */}
          <span
            className="absolute -top-2.5 left-1/2 h-5 w-14 rounded-[2px] bg-[color-mix(in_oklab,var(--candle)_38%,white)] opacity-80 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            style={{ transform: `translateX(-50%) rotate(${i % 2 ? 4 : -3}deg)` }}
          />
          <button
            onClick={() => onRemove(d.key)}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-bg opacity-100 shadow-md transition sm:opacity-0 sm:group-hover:opacity-100"
            aria-label={t.remove(d.name)}
          >
            <XIcon size={11} weight="bold" />
          </button>
          <figcaption className="mt-3 w-[136px] truncate text-center font-mono text-[10.5px] text-muted sm:w-[154px]">{d.name}</figcaption>
        </figure>
      ))}
      {docs.length < 4 && (
        <button
          onClick={onAdd}
          className="settle mb-[26px] flex h-[176px] w-[104px] shrink-0 flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong text-muted transition hover:border-accent hover:text-accent sm:h-[200px]"
          style={{ ["--rest" as string]: "0deg", animationDelay: `${docs.length * 60}ms` }}
        >
          <PlusIcon size={20} />
          <span className="px-2 text-center text-[11px] leading-tight">{docs.length === 1 ? t.addPageCompare : t.addPage}</span>
        </button>
      )}
    </div>
  );
}

function TextPaper({ doc }: { doc: Doc }) {
  const text = docText(doc);
  return <span className="block h-full overflow-hidden whitespace-pre-wrap p-3 font-serif text-[8px] leading-snug text-[#2a211b]">{text.slice(0, 900)}</span>;
}

export function Thumb({ doc, size = 76 }: { doc: Doc; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white shadow-[0_10px_24px_-12px_rgba(50,30,15,0.55)] ring-1 ring-black/5"
      style={{ width: size * 0.78, height: size }}
      title={doc.name}
    >
      {doc.preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doc.preview} alt={doc.name} className="h-full w-full object-cover object-top" />
      ) : doc.type === "text/plain" ? (
        <TextPaper doc={doc} />
      ) : (
        <FilePdfIcon size={size * 0.36} weight="duotone" className="text-[#8a5a36]" />
      )}
    </span>
  );
}
