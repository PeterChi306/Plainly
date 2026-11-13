"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { daysUntil, prettyDate } from "@/lib/ics";
import { useT } from "@/lib/i18n";
import type { Mode } from "@/lib/types";
import { Thumb } from "./Home";
import { iso } from "./CalendarView";
import { ModeIcon } from "./ModeIcon";
import type { Session } from "./Workspace";

// Every paper read in this browser, laid out by kind, with what's next on each.
export function Library({ sessions, onOpen, onNew }: { sessions: Session[]; onOpen: (id: string) => void; onNew: () => void }) {
  const t = useT();
  const [filter, setFilter] = useState<Mode | "all">("all");
  const modes = [...new Set(sessions.map((s) => s.reading?.mode).filter(Boolean))] as Mode[];
  const shown = sessions.filter((s) => filter === "all" || s.reading?.mode === filter);

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-8 sm:px-6 md:pt-14">
      <div className="rise">
        <p className="font-script text-[40px] leading-none text-accent">{t.your}</p>
        <h1 className="font-serif text-[44px] leading-none tracking-tight text-ink">{t.library}</h1>
        <p className="mt-3 text-[13.5px] text-muted">{t.librarySub}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="glass rise mt-10 rounded-[26px] px-6 py-14 text-center">
          <p className="font-serif text-[24px] text-ink">{t.emptyShelf}</p>
          <p className="mt-1 text-[13.5px] text-muted">{t.emptyShelfSub}</p>
          <button onClick={onNew} className="mt-5 rounded-full bg-ink px-4 py-2 text-[13px] text-bg">
            {t.readSomething}
          </button>
        </div>
      ) : (
        <>
          {modes.length > 1 && (
            <div className="rise mt-8 flex flex-wrap gap-1.5">
              {(["all", ...modes] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilter(m)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition ${filter === m ? "bg-ink text-bg" : "glass text-ink-2 hover:text-ink"}`}
                >
                  {m !== "all" && <ModeIcon mode={m} size={14} />}
                  {m === "all" ? t.everything : t.modes[m].name}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {shown.map((s, i) => {
              const next = s.reading?.dates
                .filter((d) => (daysUntil(d.date) ?? -1) >= 0)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              return (
                <button
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className="glass rise group flex gap-4 rounded-[22px] p-4 text-left transition hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="transition group-hover:-rotate-2">
                    <Thumb doc={s.docs[0]} size={92} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-accent">
                        <ModeIcon mode={s.reading?.mode ?? s.mode} size={14} />
                      </span>
                      <span className="label truncate">{s.reading?.kind ?? (s.status === "reading" ? t.readingLabel : t.didntFinish)}</span>
                      <span className="label shrink-0">· {prettyDate(iso(new Date(s.at)))}</span>
                    </span>
                    <span className="mt-1 block truncate font-serif text-[21px] leading-tight text-ink">{s.reading?.title ?? s.docs[0]?.name}</span>
                    {s.reading && <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-ink-2">{s.reading.headline}</span>}
                    {next && (
                      <span className="mt-2 flex items-center gap-1.5 font-mono text-[10.5px] text-muted">
                        <CalendarBlankIcon size={12} weight="duotone" />
                        {prettyDate(next.date)} · {next.title}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
