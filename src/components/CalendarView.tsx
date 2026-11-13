"use client";

import { CalendarPlusIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { currentLocale, useT } from "@/lib/i18n";
import { daysUntil, downloadCalendar, prettyDate } from "@/lib/ics";
import type { DateItem, Mode } from "@/lib/types";
import { ModeIcon } from "./ModeIcon";
import type { Session } from "./Workspace";

type Entry = DateItem & { sessionId: string; from: string; mode: Mode };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every date from every reading this session, soonest first. */
export function allDates(sessions: Session[]): Entry[] {
  return sessions
    .flatMap((s) =>
      (s.reading?.dates ?? [])
        .filter((d) => ISO.test(d.date))
        .map((d) => ({ ...d, sessionId: s.id, from: s.reading!.title, mode: s.reading!.mode })),
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// One month at a time, with every paper's dates on it. Pick a day to see
// just that day; otherwise the list shows the whole month.
export function CalendarView({ sessions, onOpen, onNew }: { sessions: Session[]; onOpen: (id: string) => void; onNew: () => void }) {
  const t = useT();
  const locale = currentLocale();
  const entries = allDates(sessions);
  const today = iso(new Date());
  const firstUpcoming = entries.find((e) => e.date >= today)?.date ?? today;
  const [month, setMonth] = useState(() => new Date(`${firstUpcoming.slice(0, 7)}-01T12:00:00`));
  const [picked, setPicked] = useState<string | null>(null);

  const key = iso(month).slice(0, 7);
  const byDay = new Map<string, Entry[]>();
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const lead = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${key}-${String(i + 1).padStart(2, "0")}`)];
  const shown = picked ? (byDay.get(picked) ?? []) : entries.filter((e) => e.date.startsWith(key));
  const upcoming = entries.filter((e) => e.date >= today);

  function step(by: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1, 12));
    setPicked(null);
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-16 pt-8 sm:px-6 md:pt-14">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-script text-[40px] leading-none text-accent">{t.your}</p>
          <h1 className="font-serif text-[44px] leading-none tracking-tight text-ink">{t.calendar}</h1>
          <p className="mt-3 text-[13.5px] text-muted">{t.calendarSub}</p>
        </div>
        {upcoming.length > 0 && (
          <button
            onClick={() => downloadCalendar(upcoming, "plainly-calendar")}
            className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-bg transition hover:opacity-90"
          >
            <CalendarPlusIcon size={15} weight="duotone" />
            {upcoming.length > 1 ? t.addAllYours(upcoming.length) : t.addYours}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="glass rise mt-10 rounded-[26px] px-6 py-14 text-center">
          <p className="font-serif text-[24px] text-ink">{t.noDates}</p>
          <p className="mt-1 text-[13.5px] text-muted">{t.noDatesSub}</p>
          <button onClick={onNew} className="mt-5 rounded-full bg-ink px-4 py-2 text-[13px] text-bg">
            {t.readSomething}
          </button>
        </div>
      ) : (
        <>
          <div className="glass rise mt-8 rounded-[26px] p-4 sm:p-5" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-serif text-[22px] text-ink">
                {month.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </p>
              <div className="flex gap-1">
                <button onClick={() => step(-1)} className="rounded-full p-1.5 text-muted transition hover:bg-glass hover:text-ink" aria-label={t.prevMonth}>
                  <CaretLeftIcon size={16} />
                </button>
                <button onClick={() => step(1)} className="rounded-full p-1.5 text-muted transition hover:bg-glass hover:text-ink" aria-label={t.nextMonth}>
                  <CaretRightIcon size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(7)].map((_, d) => new Date(2026, 0, 4 + d).toLocaleDateString(locale, { weekday: "narrow" })).map((d, i) => (
                <span key={i} className="label pb-1 text-center">
                  {d}
                </span>
              ))}
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const items = byDay.get(day) ?? [];
                const left = daysUntil(day);
                const soon = items.length > 0 && left !== null && left >= 0 && left <= 7;
                return (
                  <button
                    key={day}
                    onClick={() => setPicked(picked === day ? null : day)}
                    disabled={items.length === 0}
                    className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-[13px] transition sm:aspect-[1.3] ${
                      picked === day ? "bg-ink text-bg" : items.length ? "bg-glass-strong text-ink ring-1 ring-line hover:-translate-y-0.5" : "text-muted"
                    } ${day === today && picked !== day ? "font-semibold text-accent" : ""}`}
                  >
                    {Number(day.slice(8))}
                    {items.length > 0 && (
                      <span className="flex gap-0.5">
                        {items.slice(0, 3).map((e, j) => (
                          <span key={j} className={`h-1 w-1 rounded-full ${picked === day ? "bg-bg" : soon ? "bg-alert" : "bg-accent"}`} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between px-1">
            <p className="label">{picked ? prettyDate(picked) : t.thisMonth}</p>
            {picked && (
              <button onClick={() => setPicked(null)} className="font-mono text-[10px] uppercase tracking-wider text-muted transition hover:text-ink">
                {t.showMonth}
              </button>
            )}
          </div>
          {shown.length === 0 ? (
            <p className="mt-3 px-1 text-[13px] text-muted">{t.nothingMonth}</p>
          ) : (
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[22px] bg-glass ring-1 ring-line">
              {shown.map((e, i) => {
                const left = daysUntil(e.date);
                const soon = left !== null && left >= 0 && left <= 7;
                return (
                  <li key={`${e.sessionId}-${e.date}-${i}`} className="group flex items-center gap-4 px-5 py-3">
                    <span className="w-[92px] shrink-0 font-mono text-[12px] text-ink-2">
                      {prettyDate(e.date)}
                      {e.time && <span className="block text-muted">{e.time}</span>}
                    </span>
                    <button onClick={() => onOpen(e.sessionId)} className="min-w-0 flex-1 text-left">
                      <span className="block text-[14px] text-ink">{e.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted transition group-hover:text-accent">
                        <ModeIcon mode={e.mode} size={12} />
                        <span className="truncate">{e.from}</span>
                      </span>
                    </button>
                    {left !== null && left >= 0 && (
                      <span className={`shrink-0 font-mono text-[10.5px] ${soon ? "text-alert" : "text-muted"}`}>
                        {left === 0 ? t.today : t.inDays(left)}
                      </span>
                    )}
                    <button
                      onClick={() => downloadCalendar([e], e.title.replace(/[^\w -]/g, ""))}
                      className="shrink-0 text-muted transition hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label={t.addThis(e.title)}
                    >
                      <CalendarPlusIcon size={18} weight="duotone" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
