"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";
import { MODES } from "@/lib/modes";
import type { ModeChoice } from "@/lib/types";
import { ModeIcon } from "./ModeIcon";

const LIST_HEIGHT = 330;

// Chosen the way you'd choose a model: a quiet button that opens a list.
// The list is drawn on <body>, so the glowing desk around it can't clip it.
export function ModePicker({ mode, onMode }: { mode: ModeChoice; onMode: (m: ModeChoice) => void }) {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const t = useT();
  const open = at !== null;

  function toggle() {
    if (open) return setAt(null);
    const r = box.current!.getBoundingClientRect();
    const below = r.bottom + 8 + LIST_HEIGHT < window.innerHeight;
    setAt({ left: Math.min(r.left, window.innerWidth - 280), top: below ? r.bottom + 8 : r.top - 8 - LIST_HEIGHT });
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !list.current?.contains(t)) setAt(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAt(null);
    const away = () => setAt(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition ${open ? "bg-glass-strong text-ink" : "text-ink-2 hover:bg-glass-strong hover:text-ink"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-accent">
          <ModeIcon mode={mode} size={16} />
        </span>
        {t.modes[mode].name}
        <CaretDownIcon size={11} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {at &&
        createPortal(
          <div
            ref={list}
            role="listbox"
            className="glass-strong pop fixed z-[60] w-[264px] rounded-[18px] p-1.5 ring-1 ring-line"
            style={{ left: at.left, top: at.top }}
          >
            <p className="label px-3 pb-1.5 pt-2">{t.readAs}</p>
            {MODES.map((m) => (
              <button
                key={m}
                role="option"
                aria-selected={m === mode}
                onClick={() => {
                  onMode(m);
                  setAt(null);
                }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition hover:bg-glass"
              >
                <span className="text-accent">
                  <ModeIcon mode={m} size={18} />
                </span>
                <span className="flex-1">
                  <span className="block text-[13.5px] leading-tight text-ink">{t.modes[m].name}</span>
                  <span className="block text-[11.5px] leading-tight text-muted">{t.modes[m].hint}</span>
                </span>
                {m === mode && <CheckIcon size={14} weight="bold" className="text-accent" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
