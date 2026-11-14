"use client";

import { ArrowsClockwiseIcon, CaretDownIcon, ListIcon, TranslateIcon, WarningIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Doc, fetchDoc } from "@/lib/files";
import { forget, forgetAll, keep, loadHistory } from "@/lib/history";
import { useLanguage } from "@/lib/i18n";
import { marksOf } from "@/lib/marks";
import { LANGUAGES, MODES } from "@/lib/modes";
import { SAMPLES } from "@/lib/samples";
import type { ChatMessage, ModeChoice, Reading } from "@/lib/types";
import { CalendarView } from "./CalendarView";
import { Composer } from "./Composer";
import { Home, Thumb } from "./Home";
import { Library } from "./Library";
import { Logo, Mark } from "./Logo";
import { ModelText } from "./Message";
import { ModeIcon } from "./ModeIcon";
import { type Focus, PaperPanel, Viewer } from "./Paper";
import { ReadingView } from "./ReadingView";
import { Search } from "./Search";
import { Sidebar } from "./Sidebar";
import { Thinking, TypingOrb } from "./Thinking";

export type Session = {
  id: string;
  /** When it was first read. */
  at: number;
  docs: Doc[];
  mode: ModeChoice;
  language: string;
  /** What was typed with the upload; its language is the reading's. */
  question: string;
  status: "reading" | "ready" | "error";
  reading?: Reading;
  error?: string;
  chat: ChatMessage[];
  answering: boolean;
  /** Checklist items ticked off. */
  ticked: number[];
};

const files = (docs: Doc[]) => docs.map(({ name, type, data }) => ({ name, type, data }));

type Turn = Pick<Session, "id" | "docs" | "reading" | "chat" | "language">;

const WIDE = "(min-width: 1280px)";
type View = "home" | "library" | "calendar" | "session";
type Side = "left" | "right";

const SIDE_KEY = "plainly-paper-side";

// Finished readings are kept in this browser (see history.ts), never on the server.
export function Workspace() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const kept = useRef(new Map<string, Session>());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<ModeChoice>("auto");
  const { language, setLanguage, t } = useLanguage();
  const [left, setLeft] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [menu, setMenu] = useState(false);
  const [searching, setSearching] = useState(false);
  const [side, setSide] = useState<Side>(() => {
    try {
      return localStorage.getItem(SIDE_KEY) === "right" ? "right" : "left";
    } catch {
      return "left";
    }
  });
  const [viewing, setViewing] = useState<{ docs: Doc[]; page: number; focus?: Focus } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const active = view === "session" ? (sessions.find((s) => s.id === activeId) ?? null) : null;
  const marks = useMemo(() => (active?.reading?.readable ? marksOf(active.reading) : []), [active?.reading]);

  // What was read here before comes back, after anything already started.
  useEffect(() => {
    loadHistory().then((past) => {
      for (const s of past) kept.current.set(s.id, s);
      setSessions((now) => [...now, ...past.filter((p) => !now.some((n) => n.id === p.id))]);
      setLoaded(true);
    });
  }, []);

  // Save a session whenever it settles: read, ticked, or answered.
  useEffect(() => {
    if (!loaded) return;
    for (const s of sessions) {
      if (s.status !== "ready" || s.answering || kept.current.get(s.id) === s) continue;
      kept.current.set(s.id, s);
      keep(s);
    }
  }, [sessions, loaded]);

  useEffect(() => {
    document.documentElement.lang = LANGUAGES.find((l) => l.id === language)?.locale.split("-")[0] ?? "en";
  }, [language]);

  // How many of today's messages are left, from the server's count.
  const count = useCallback(
    async (res: Response) => {
      const n = Number(res.headers.get("X-Messages-Left"));
      if (res.ok && res.headers.has("X-Messages-Left")) setLeft(n);
      if (res.ok) return null;
      const json = await res.json().catch(() => ({}));
      if (json.code === "limit") {
        setLeft(0);
        return t.limit;
      }
      return json.error ?? t.somethingWrong;
    },
    [t],
  );
  const update = useCallback((id: string, change: (s: Session) => Partial<Session>) => {
    setSessions((all) => all.map((s) => (s.id === id ? { ...s, ...change(s) } : s)));
  }, []);

  const go = useCallback((next: View, id: string | null = null) => {
    setView(next);
    setActiveId(id);
    setFocus(null);
    setMenu(false);
    setSearching(false);
    scroller.current?.scrollTo({ top: 0 });
  }, []);

  const ask = useCallback(
    async (turn: Turn, text: string, shown = text) => {
      const history: ChatMessage[] = [...turn.chat, { role: "user", text: shown }];
      // What's sent can be fuller than what's shown (a draft button's instruction).
      const sent: ChatMessage[] = [...turn.chat, { role: "user", text }];
      update(turn.id, () => ({ chat: [...history, { role: "model", text: "" }], answering: true }));
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: files(turn.docs), reading: turn.reading, messages: sent, language: turn.language }),
        });
        const problem = await count(res);
        if (problem || !res.body) throw new Error(problem ?? t.somethingWrong);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          const now = answer;
          update(turn.id, () => ({ chat: [...history, { role: "model", text: now }] }));
        }
        if (!answer.trim()) throw new Error(t.noAnswer);
      } catch (e) {
        const message = e instanceof Error ? e.message : t.somethingWrong;
        update(turn.id, () => ({ chat: [...history, { role: "model", text: message }] }));
      } finally {
        update(turn.id, () => ({ answering: false }));
      }
    },
    [update, count, t],
  );

  // The question only sets the reading's language here; start() asks it.
  const read = useCallback(
    async (id: string, docs: Doc[], m: ModeChoice, lang: string, question: string): Promise<Reading | null> => {
      update(id, () => ({ status: "reading", error: undefined, reading: undefined, chat: [], ticked: [], mode: m, language: lang, question }));
      try {
        const res = await fetch("/api/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: files(docs), mode: m, language: lang, question }),
        });
        const problem = await count(res);
        if (problem) throw new Error(problem);
        const json = await res.json();
        update(id, () => ({ status: "ready", reading: json.reading }));
        return json.reading;
      } catch (e) {
        update(id, () => ({ status: "error", error: e instanceof Error ? e.message : t.somethingWrong }));
        return null;
      }
    },
    [update, count, t],
  );

  const start = useCallback(
    async (docs: Doc[], m: ModeChoice, question = "") => {
      const id = crypto.randomUUID();
      setSessions((all) => [{ id, at: Date.now(), docs, mode: m, language, question, status: "reading", chat: [], answering: false, ticked: [] }, ...all]);
      go("session", id);
      const reading = await read(id, docs, m, language, question);
      // A question typed alongside the upload is answered right after.
      if (question && reading?.readable) ask({ id, docs, reading, chat: [], language }, question);
    },
    [language, read, ask, go],
  );

  // A quote was tapped: show where it is, beside the answer or full screen.
  const cite = useCallback(
    (id: string) => {
      if (!active) return;
      const mark = marks.find((m) => m.id === id);
      if (!mark) return;
      const next: Focus = { id, doc: mark.doc, nonce: Date.now() };
      if (window.matchMedia(WIDE).matches) setFocus(next);
      else setViewing({ docs: active.docs, page: mark.doc, focus: next });
    },
    [active, marks],
  );

  const startSample = useCallback(
    async (sampleId: string) => {
      const sample = SAMPLES.find((s) => s.id === sampleId);
      if (!sample) return;
      const docs = await Promise.all(sample.files.map((f) => fetchDoc(f.url, f.name)));
      start(docs, mode);
    },
    [mode, start],
  );

  // A link like /?try=bill opens straight onto a sample — handy for judges.
  const tried = useRef(false);
  useEffect(() => {
    const sample = new URLSearchParams(window.location.search).get("try");
    if (!sample || tried.current) return;
    tried.current = true;
    window.history.replaceState(null, "", "/");
    startSample(sample);
  }, [startSample]);

  // Keep the newest words in view while an answer streams in.
  const lastText = active?.chat.at(-1)?.text.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !active?.answering) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastText, active?.answering]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        open={menu}
        onClose={() => setMenu(false)}
        sessions={sessions}
        activeId={activeId}
        view={view}
        onNew={() => go("home")}
        onLibrary={() => go("library")}
        onCalendar={() => go("calendar")}
        onSearch={() => {
          setMenu(false);
          setSearching(true);
        }}
        onSelect={(id) => go("session", id)}
        language={language}
        onLanguage={setLanguage}
        onRemove={(id) => {
          setSessions((all) => all.filter((s) => s.id !== id));
          kept.current.delete(id);
          forget(id);
          if (id === activeId) go("home");
        }}
        onClear={() => {
          setSessions([]);
          kept.current.clear();
          forgetAll();
          go("home");
        }}
      />

      <main className={`relative flex min-w-0 flex-1 ${active && side === "right" ? "flex-row-reverse" : ""}`}>
        {active && (
          <aside
            key={active.id}
            className={`rise hidden w-[47%] max-w-[760px] shrink-0 py-4 xl:block ${side === "left" ? "pl-4" : "pr-4"}`}
          >
            <PaperPanel
              docs={active.docs}
              reading={active.status === "reading"}
              side={side}
              onSide={() => {
                const next = side === "left" ? "right" : "left";
                setSide(next);
                try {
                  localStorage.setItem(SIDE_KEY, next);
                } catch {}
              }}
              onExpand={(page) => setViewing({ docs: active.docs, page })}
              marks={marks}
              focus={focus}
            />
          </aside>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 px-4 pt-3 md:hidden">
            <button onClick={() => setMenu(true)} className="glass rounded-full p-2 text-ink" aria-label={t.openMenu}>
              <ListIcon size={18} />
            </button>
            <button onClick={() => go("home")}>
              <Logo size={24} />
            </button>
          </header>

          <div ref={scroller} className="scroll-quiet flex-1 overflow-y-auto">
            {active ? (
              <SessionView
                key={active.id}
                session={active}
                language={language}
                onMode={(m) => read(active.id, active.docs, m, active.language, active.question)}
                onRetry={() => read(active.id, active.docs, active.mode, active.language, active.question)}
                onReadIn={() => read(active.id, active.docs, active.mode, language, "")}
                onDraft={(label, instruction) => ask(active, instruction, t.writeDraft(label))}
                onView={(page) => setViewing({ docs: active.docs, page })}
                onCite={cite}
                onTick={(i) => update(active.id, (s) => ({ ticked: s.ticked.includes(i) ? s.ticked.filter((x) => x !== i) : [...s.ticked, i] }))}
              />
            ) : view === "library" ? (
              <Library sessions={sessions} onOpen={(id) => go("session", id)} onNew={() => go("home")} />
            ) : view === "calendar" ? (
              <CalendarView sessions={sessions} onOpen={(id) => go("session", id)} onNew={() => go("home")} />
            ) : (
              <Home
                mode={mode}
                language={language}
                left={left}
                onMode={setMode}
                onRead={(docs, question) => start(docs, mode, question)}
                onSample={startSample}
              />
            )}
          </div>

          {active?.status === "ready" && active.reading?.readable && (
            <Composer
              key={active.id}
              language={active.language}
              busy={active.answering}
              left={left}
              suggestions={active.chat.length === 0 ? active.reading.questions.slice(0, 4) : []}
              onSend={(text) => ask(active, text)}
            />
          )}
        </div>
      </main>

      {viewing && (
        <Viewer docs={viewing.docs} start={viewing.page} onClose={() => setViewing(null)} marks={viewing.docs === active?.docs ? marks : []} focus={viewing.focus} />
      )}
      {searching && <Search sessions={sessions} onOpen={(id) => go("session", id)} onClose={() => setSearching(false)} />}
    </div>
  );
}

function SessionView({
  session,
  language,
  onMode,
  onRetry,
  onReadIn,
  onDraft,
  onView,
  onCite,
  onTick,
}: {
  session: Session;
  language: string;
  onMode: (m: ModeChoice) => void;
  onRetry: () => void;
  onReadIn: () => void;
  onDraft: (label: string, ask: string) => void;
  onView: (page: number) => void;
  onCite: (id: string) => void;
  onTick: (i: number) => void;
}) {
  const { t } = useLanguage();
  const [picker, setPicker] = useState(false);
  const r = session.reading;
  const shownMode: ModeChoice = r?.mode ?? session.mode;

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-10 pt-6 sm:px-6 md:pt-12">
      <div className="rise flex items-start gap-4">
        <div className="flex shrink-0 -space-x-6 xl:hidden">
          {session.docs.map((d, i) => (
            <button
              key={i}
              onClick={() => onView(i)}
              className="transition hover:-translate-y-1"
              style={{ transform: `rotate(${(i - (session.docs.length - 1) / 2) * 5}deg)` }}
              aria-label={t.view(d.name)}
            >
              <Thumb doc={d} size={68} />
            </button>
          ))}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="truncate font-serif text-[30px] leading-tight text-ink">
            {r?.title ?? (session.status === "reading" ? t.readingNow : session.docs[0]?.name)}
          </h2>
          <div className="relative mt-1.5 flex flex-wrap items-center gap-2">
            {r?.kind && <span className="label">{r.kind}</span>}
            {r?.kind && <span className="text-muted">·</span>}
            <button
              onClick={() => setPicker((p) => !p)}
              disabled={session.status === "reading"}
              className="flex items-center gap-1.5 rounded-full bg-glass px-2.5 py-1 text-[12px] text-ink-2 ring-1 ring-line transition hover:text-ink disabled:opacity-60"
            >
              <span className="text-accent">
                <ModeIcon mode={shownMode} size={14} />
              </span>
              {t.modes[shownMode].name}
              <CaretDownIcon size={11} />
            </button>
            {picker && (
              <div className="glass-strong absolute left-0 top-9 z-20 w-56 rounded-2xl p-1.5 ring-1 ring-line">
                <p className="label px-2.5 pb-1 pt-1.5">{t.readAgainAs}</p>
                {MODES.filter((m) => m !== "auto").map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setPicker(false);
                      onMode(m);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-glass hover:text-ink"
                  >
                    <span className="text-accent">
                      <ModeIcon mode={m} size={16} />
                    </span>
                    {t.modes[m].name}
                  </button>
                ))}
              </div>
            )}
            {/* The app's language changed since this was read: offer, don't spend a message unasked. */}
            {session.status !== "reading" && session.language !== language && (
              <button
                onClick={onReadIn}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] text-muted transition hover:bg-glass hover:text-ink"
              >
                <TranslateIcon size={14} weight="duotone" />
                {t.readAgainIn(LANGUAGES.find((l) => l.id === language)?.label ?? language)}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {session.status === "reading" && <Thinking mode={session.mode} count={session.docs.length} />}

        {session.status === "error" && (
          <div className="glass rise rounded-[22px] px-6 py-6 text-center">
            <p className="font-serif text-[22px] text-ink">{t.didntWork}</p>
            <p className="mt-1 text-[13.5px] text-ink-2">{session.error}</p>
            <button onClick={onRetry} className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] text-bg">
              <ArrowsClockwiseIcon size={15} />
              {t.tryAgain}
            </button>
          </div>
        )}

        {session.status === "ready" && r && !r.readable && (
          <div className="rise rounded-[22px] border border-warn/30 bg-warn/[0.07] px-6 py-6">
            <div className="flex gap-3">
              <WarningIcon size={24} weight="duotone" className="shrink-0 text-warn" />
              <div>
                <p className="text-[15px] font-medium text-ink">{t.cantRead}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{r.problem}</p>
                <p className="mt-2 text-[12.5px] text-muted">{t.clearerPhoto}</p>
              </div>
            </div>
          </div>
        )}

        {session.status === "ready" && r?.readable && <ReadingView reading={r} onDraft={onDraft} onCite={onCite} ticked={session.ticked} onTick={onTick} />}

        {session.chat.length > 0 && (
          <div className="mt-10 space-y-6 border-t border-line pt-8">
            {session.chat.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="rise flex justify-end">
                  <p className="glass max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-[14.5px] text-ink">{m.text}</p>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <span className="mt-0.5 shrink-0">
                    <Mark size={20} />
                  </span>
                  <div className="min-w-0 flex-1">{m.text ? <ModelText text={m.text} /> : <TypingOrb />}</div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
