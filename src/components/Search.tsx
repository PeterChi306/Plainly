"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { ModeIcon } from "./ModeIcon";
import type { Session } from "./Workspace";

// Searches everything Plainly said about each paper, and the chats.
function haystack(s: Session) {
  const r = s.reading;
  const parts = [s.docs.map((d) => d.name).join(" ")];
  if (r) {
    parts.push(r.title, r.kind, r.headline, r.detail);
    r.facts.forEach((f) => parts.push(`${f.label}: ${f.value}`));
    r.checks.forEach((c) => parts.push(`${c.title}: ${c.detail}`));
    r.steps.forEach((x) => parts.push(x.text));
    r.dates.forEach((d) => parts.push(`${d.title} ${d.date}`));
  }
  s.chat.forEach((m) => parts.push(m.text));
  return parts.filter(Boolean);
}

export function Search({ sessions, onOpen, onClose }: { sessions: Session[]; onOpen: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return sessions
      .map((s) => {
        const lines = haystack(s);
        if (words.length === 0) return { s, line: s.reading?.headline ?? "" };
        const line = lines.find((l) => words.every((w) => l.toLowerCase().includes(w)));
        const all = lines.join(" ").toLowerCase();
        return words.every((w) => all.includes(w)) ? { s, line: line ?? lines.find((l) => l.toLowerCase().includes(words[0])) ?? "" } : null;
      })
      .filter((x): x is { s: Session; line: string } => x !== null);
  }, [q, sessions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIndex((i) => Math.min(i + 1, results.length - 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Enter" && results[index]) onOpen(results[index].s.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, index, onOpen, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 px-4 pt-[14vh] backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass-strong pop w-full max-w-[560px] overflow-hidden rounded-[24px] ring-1 ring-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5">
          <MagnifyingGlassIcon size={18} weight="duotone" className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIndex(0);
            }}
            placeholder={t.searchPlaceholder}
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <kbd className="font-mono text-[10px] text-muted">esc</kbd>
        </div>
        <div className="scroll-quiet max-h-[50vh] overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">{t.searchEmpty}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">{t.noMatch(q)}</p>
          ) : (
            results.map(({ s, line }, i) => (
              <button
                key={s.id}
                onClick={() => onOpen(s.id)}
                onMouseEnter={() => setIndex(i)}
                className={`flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left transition ${i === index ? "bg-glass" : ""}`}
              >
                <span className="mt-0.5 text-accent">
                  <ModeIcon mode={s.reading?.mode ?? s.mode} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] text-ink">{s.reading?.title ?? s.docs[0]?.name}</span>
                    <span className="label shrink-0">{s.reading ? t.modes[s.reading.mode].name : ""}</span>
                  </span>
                  {line && <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-muted">{line}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
