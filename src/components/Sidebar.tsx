"use client";

import { BooksIcon, CalendarBlankIcon, LockKeyIcon, MagnifyingGlassIcon, MoonIcon, NotePencilIcon, SunIcon, TranslateIcon, XIcon, CircleHalfIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/modes";
import { type ThemeChoice, useTheme } from "@/lib/useTheme";
import { allDates, iso } from "./CalendarView";
import { Logo } from "./Logo";
import { ModeIcon } from "./ModeIcon";
import type { Session } from "./Workspace";

type Props = {
  open: boolean;
  onClose: () => void;
  sessions: Session[];
  activeId: string | null;
  view: "home" | "library" | "calendar" | "session";
  onNew: () => void;
  onLibrary: () => void;
  onCalendar: () => void;
  onSearch: () => void;
  onSelect: (id: string) => void;
  language: string;
  onLanguage: (language: string) => void;
  onClear: () => void;
};

function Row({ icon, children, on, onClick, trail }: { icon: ReactNode; children: ReactNode; on?: boolean; onClick?: () => void; trail?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition ${on ? "bg-glass-strong text-ink shadow-[0_1px_2px_rgba(60,40,20,0.08)]" : "text-ink-2 hover:bg-glass hover:text-ink"}`}
    >
      <span className={on ? "text-accent" : "text-muted"}>{icon}</span>
      <span className="flex-1">{children}</span>
      {trail}
    </button>
  );
}

const THEMES: { id: ThemeChoice; icon: ReactNode }[] = [
  { id: "light", icon: <SunIcon size={14} weight="duotone" /> },
  { id: "system", icon: <CircleHalfIcon size={14} weight="duotone" /> },
  { id: "dark", icon: <MoonIcon size={14} weight="duotone" /> },
];

export function Sidebar(props: Props) {
  const { open, onClose, sessions, activeId, view, onNew, onLibrary, onCalendar, onSearch, onSelect, language, onLanguage, onClear } = props;
  const theme = useTheme();
  const t = useT();
  // Only once something's been read, so the server's prerender never reads the clock.
  const upcoming = sessions.length ? allDates(sessions).filter((d) => d.date >= iso(new Date())).length : 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/25 backdrop-blur-[2px] transition-opacity md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`glass-strong fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-line transition-transform duration-300 md:static md:z-auto md:translate-x-0 md:bg-transparent md:shadow-none md:backdrop-blur-none ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 pb-5 pt-5">
          <button onClick={onNew} aria-label={t.home}>
            <Logo />
          </button>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:text-ink md:hidden" aria-label={t.closeMenu}>
            <XIcon size={18} />
          </button>
        </div>

        <div className="space-y-0.5 px-3">
          <Row icon={<NotePencilIcon size={18} weight="duotone" />} on={view === "home"} onClick={onNew}>
            {t.newReading}
          </Row>
          <Row
            icon={<BooksIcon size={18} weight="duotone" />}
            on={view === "library"}
            onClick={onLibrary}
            trail={sessions.length > 0 && <span className="font-mono text-[10.5px] text-muted">{sessions.length}</span>}
          >
            {t.library}
          </Row>
          <Row
            icon={<CalendarBlankIcon size={18} weight="duotone" />}
            on={view === "calendar"}
            onClick={onCalendar}
            trail={upcoming > 0 && <span className="font-mono text-[10.5px] text-muted">{upcoming}</span>}
          >
            {t.calendar}
          </Row>
          <Row icon={<MagnifyingGlassIcon size={18} weight="duotone" />} onClick={onSearch} trail={<kbd className="font-mono text-[10px] text-muted">⌘K</kbd>}>
            {t.search}
          </Row>
        </div>

        <div className="mx-5 my-4 h-px bg-line" />

        <div className="space-y-0.5 px-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] text-ink-2 transition hover:bg-glass hover:text-ink">
            <TranslateIcon size={18} weight="duotone" className="text-muted" />
            <span className="flex-1">{t.language}</span>
            <select
              value={language}
              onChange={(e) => onLanguage(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent text-right text-[13px] text-ink outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3 rounded-xl px-2.5 py-1.5 text-[13.5px] text-ink-2">
            <span className="text-muted">{theme.dark ? <MoonIcon size={18} weight="duotone" /> : <SunIcon size={18} weight="duotone" />}</span>
            <span className="flex-1">{t.appearance}</span>
            <span className="flex rounded-full bg-glass p-0.5 ring-1 ring-line">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => theme.setChoice(th.id)}
                  className={`flex h-6 w-7 items-center justify-center rounded-full transition ${theme.choice === th.id ? "bg-solid text-accent shadow-sm" : "text-muted hover:text-ink"}`}
                  aria-label={t.themes[th.id]}
                  title={t.themes[th.id]}
                >
                  {th.icon}
                </button>
              ))}
            </span>
          </div>
          <Link href="/privacy" className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13.5px] text-ink-2 transition hover:bg-glass hover:text-ink">
            <LockKeyIcon size={18} weight="duotone" className="text-muted" />
            {t.privacy}
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between px-5 pb-2">
          <p className="label">{t.history}</p>
          {sessions.length > 0 && (
            <button onClick={onClear} className="font-mono text-[10px] uppercase tracking-wider text-muted transition hover:text-alert">
              {t.clear}
            </button>
          )}
        </div>
        <nav className="scroll-quiet flex-1 overflow-y-auto px-3 pb-3">
          {sessions.length === 0 ? (
            <p className="px-2.5 text-[12px] leading-relaxed text-muted">
              {t.historyEmpty[0]}
              <br />
              {t.historyEmpty[1]}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onSelect(s.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${view === "session" && s.id === activeId ? "bg-glass-strong text-ink" : "text-ink-2 hover:bg-glass"}`}
                  >
                    <span className="text-muted">
                      <ModeIcon mode={s.reading?.mode ?? s.mode} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] leading-tight">
                        {s.reading?.title ?? (s.status === "reading" ? t.readingNow : s.docs[0]?.name)}
                      </span>
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                        {s.reading ? t.modes[s.reading.mode].name : s.status === "error" ? t.didntFinish : t.readingLabel}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <p className="border-t border-line px-5 py-3 font-mono text-[10px] leading-relaxed text-muted">{t.tagline}</p>
      </aside>
    </>
  );
}
