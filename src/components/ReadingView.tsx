"use client";

import {
  CalendarPlusIcon,
  CheckCircleIcon,
  CheckIcon,
  EnvelopeSimpleIcon,
  HighlighterIcon,
  InfoIcon,
  LifebuoyIcon,
  MagicWandIcon,
  WarningIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { daysUntil, downloadCalendar, prettyDate } from "@/lib/ics";
import type { Ink } from "@/lib/marks";
import type { Reading, Tone, Verdict } from "@/lib/types";

const TONE: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-ok",
  warn: "text-warn",
  bad: "text-alert",
};

const VERDICT: Record<Verdict, { icon: ReactNode; ring: string }> = {
  ok: { icon: <CheckCircleIcon size={20} weight="duotone" />, ring: "text-ok" },
  info: { icon: <InfoIcon size={20} weight="duotone" />, ring: "text-muted" },
  warn: { icon: <WarningIcon size={20} weight="duotone" />, ring: "text-warn" },
  alert: { icon: <WarningOctagonIcon size={20} weight="duotone" />, ring: "text-alert" },
};

const TONE_INK: Record<Tone, Ink> = { bad: "alert", warn: "warn", good: "ok", neutral: "note" };
const VERDICT_INK: Record<Verdict, Ink> = { alert: "alert", warn: "warn", ok: "ok", info: "note" };

// The quote behind a claim. Tapping it shows where it sits on the paper,
// in the same highlighter color.
function Source({ text, ink, onCite }: { text: string; ink: Ink; onCite?: () => void }) {
  const t = useT();
  if (!text) return null;
  const quote = <span className={`ink-${ink} rounded-[3px] box-decoration-clone px-0.5`}>“{text}”</span>;
  if (!onCite) {
    return <p className="mt-1.5 border-l border-line-strong pl-2.5 font-serif text-[13.5px] italic leading-snug text-ink-2">{quote}</p>;
  }
  return (
    <button
      onClick={onCite}
      title={t.showOnPage}
      className="group/cite mt-1.5 flex items-start gap-1.5 border-l border-line-strong pl-2.5 text-left font-serif text-[13.5px] italic leading-snug text-ink-2 transition hover:text-ink"
    >
      <span>{quote}</span>
      <HighlighterIcon size={13} weight="duotone" className="mt-0.5 shrink-0 text-muted transition group-hover/cite:text-accent" />
    </button>
  );
}

function Section({ title, children, aside, delay = 0 }: { title: string; children: ReactNode; aside?: ReactNode; delay?: number }) {
  return (
    <section className="rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="label">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

type Props = {
  reading: Reading;
  onDraft: (label: string, ask: string) => void;
  onCite: (id: string) => void;
  ticked: number[];
  onTick: (i: number) => void;
};

export function ReadingView({ reading, onDraft, onCite, ticked, onTick }: Props) {
  const t = useT();
  const r = reading;
  const sortedDates = [...r.dates].sort((a, b) => a.date.localeCompare(b.date));
  const nameForFile = r.title.replace(/[^\w -]/g, "").trim() || "plainly";
  const list = r.checklist?.items ?? [];

  return (
    <div className="space-y-9">
      {/* The answer */}
      <div className="glass rise rounded-[26px] px-6 py-6 sm:px-7">
        <p className="label">{t.inPlainWords}</p>
        <p className="mt-3 font-serif text-[27px] leading-[1.18] text-ink sm:text-[31px]">{r.headline}</p>
        {r.detail && <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{r.detail}</p>}
      </div>

      {r.help.needed && (
        <div
          className={`rise rounded-[22px] border px-5 py-5 [animation-delay:60ms] ${r.help.urgency === "urgent" ? "border-alert/30 bg-alert/[0.07]" : "border-warn/30 bg-warn/[0.07]"}`}
        >
          <div className="flex items-start gap-3">
            <span className={r.help.urgency === "urgent" ? "text-alert" : "text-warn"}>
              <LifebuoyIcon size={24} weight="duotone" />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-medium text-ink">{r.help.urgency === "urgent" ? t.helpUrgent : t.helpSoon}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{r.help.reason}</p>
              {r.help.who && (
                <p className="mt-2 text-[13.5px] text-ink-2">
                  <span className="text-muted">{t.whoToAsk} · </span>
                  {r.help.who}
                </p>
              )}
              {r.help.questions.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {r.help.questions.map((q) => (
                    <li key={q} className="flex gap-2 text-[13.5px] text-ink-2">
                      <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-muted" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12px] text-muted">
                {t.freeHelp[0]} <span className="text-ink-2">211</span>, {t.freeHelp[1]}{" "}
                <a className="text-ink-2 underline decoration-line-strong underline-offset-2" href="https://www.lawhelp.org" target="_blank" rel="noreferrer">
                  lawhelp.org
                </a>
                . {t.freeHelp[2]}
              </p>
            </div>
          </div>
        </div>
      )}

      {r.facts.length > 0 && (
        <div className="rise grid grid-cols-1 gap-2.5 [animation-delay:100ms] sm:grid-cols-2">
          {r.facts.map((f, i) => (
            <div key={f.label + f.value} className="rounded-[20px] bg-glass px-5 py-4 ring-1 ring-line">
              <p className="label">{f.label}</p>
              <p className={`mt-1.5 font-serif text-[26px] leading-tight ${TONE[f.tone]}`}>{f.value}</p>
              <Source text={f.source} ink={TONE_INK[f.tone]} onCite={() => onCite(`fact-${i}`)} />
            </div>
          ))}
        </div>
      )}

      {r.checks.length > 0 && (
        <Section title={t.checked} delay={140}>
          <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-glass ring-1 ring-line">
            {r.checks.map((c, i) => (
              <li key={c.title} className="flex gap-3.5 px-5 py-4">
                <span className={`mt-0.5 ${VERDICT[c.verdict].ring}`}>{VERDICT[c.verdict].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-ink">{c.title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{c.detail}</p>
                  <Source text={c.source} ink={VERDICT_INK[c.verdict]} onCite={() => onCite(`check-${i}`)} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {r.steps.length > 0 && (
        <Section title={t.next} delay={180}>
          <ol className="space-y-3">
            {r.steps.map((s, i) => (
              <li key={s.text} className="flex items-start gap-4 rounded-[18px] px-1 py-1">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-bg">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-[14.5px] leading-relaxed text-ink">
                    {s.text}
                    {s.when && <span className="ml-2 font-mono text-[11px] text-muted">{t.by(prettyDate(s.when))}</span>}
                  </p>
                  {s.how && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{s.how}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {list.length > 0 && (
        <Section
          title={r.checklist.title || t.checklist}
          delay={190}
          aside={<span className="font-mono text-[10.5px] text-muted">{t.progress(ticked.length, list.length)}</span>}
        >
          <ul className="overflow-hidden rounded-[22px] bg-glass ring-1 ring-line">
            {list.map((item, i) => {
              const done = ticked.includes(i);
              return (
                <li key={i} className="border-b border-line last:border-0">
                  <button onClick={() => onTick(i)} className="flex w-full items-start gap-3.5 px-5 py-3 text-left transition hover:bg-glass" aria-pressed={done}>
                    <span
                      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] ring-1 transition ${done ? "bg-accent text-on-accent ring-accent" : "ring-line-strong"}`}
                    >
                      {done && <CheckIcon size={12} weight="bold" />}
                    </span>
                    <span className={`text-[14px] leading-relaxed transition ${done ? "text-muted line-through decoration-line-strong" : "text-ink"}`}>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {r.drafts.length > 0 && (
        <Section title={t.canWrite} delay={200}>
          <div className="flex flex-wrap gap-2">
            {r.drafts.map((d) => (
              <button
                key={d.label}
                onClick={() => onDraft(d.label, d.ask)}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] text-on-accent shadow-[0_8px_24px_-12px_var(--accent)] transition hover:brightness-110"
              >
                {/letter|email|note/i.test(d.label) ? (
                  <EnvelopeSimpleIcon size={16} weight="duotone" />
                ) : (
                  <MagicWandIcon size={16} weight="duotone" />
                )}
                {d.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      {sortedDates.length > 0 && (
        <Section
          title={t.dates}
          delay={220}
          aside={
            <button
              onClick={() => downloadCalendar(sortedDates, nameForFile)}
              className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-bg transition hover:opacity-90"
            >
              <CalendarPlusIcon size={15} weight="duotone" />
              {sortedDates.length > 1 ? t.addAll(sortedDates.length) : t.addOne}
            </button>
          }
        >
          <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-glass ring-1 ring-line">
            {sortedDates.map((d) => {
              const days = daysUntil(d.date);
              const soon = days !== null && days >= 0 && days <= 7;
              return (
                <li key={d.date + d.title} className="group flex items-center gap-4 px-5 py-3">
                  <span className="w-[92px] shrink-0 font-mono text-[12px] text-ink-2">{prettyDate(d.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] text-ink">{d.title}</span>
                    {d.note && <span className="block text-[12px] text-muted">{d.note}</span>}
                  </span>
                  {days !== null && days >= 0 && (
                    <span className={`shrink-0 font-mono text-[10.5px] ${soon ? "text-alert" : "text-muted"}`}>
                      {days === 0 ? t.today : t.inDays(days)}
                    </span>
                  )}
                  <button
                    onClick={() => downloadCalendar([d], d.title.replace(/[^\w -]/g, ""))}
                    className="shrink-0 text-muted transition hover:text-accent sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={t.addThis(d.title)}
                  >
                    <CalendarPlusIcon size={18} weight="duotone" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {r.missing.length > 0 && (
        <Section title={t.notInDoc} delay={240}>
          <ul className="space-y-1.5">
            {r.missing.map((m) => (
              <li key={m} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                <span className="text-muted">○</span>
                {m}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
