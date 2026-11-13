"use client";

import { useEffect, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import { useT } from "@/lib/i18n";
import type { ModeChoice } from "@/lib/types";
import { Glow } from "./Glow";

// The orb changes with what Plainly is doing, the way Chief's does.
const ORBS: Record<ModeChoice, OrbState[]> = {
  auto: ["searching", "solving", "connecting", "composing"],
  money: ["searching", "solving", "connecting", "composing"],
  legal: ["searching", "solving", "connecting", "composing"],
  assignment: ["searching", "solving", "connecting", "composing"],
  syllabus: ["searching", "connecting", "solving", "composing"],
  other: ["searching", "composing"],
};

export function Thinking({ mode, count }: { mode: ModeChoice; count: number }) {
  const t = useT();
  const steps = t.thinking[mode];
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 2600);
    return () => clearInterval(id);
  }, [steps.length]);

  const state = ORBS[mode][i] ?? "composing";
  const text = steps[i];
  return (
    <Glow busy>
      <div className="glass rise flex flex-col items-center rounded-[28px] px-6 py-14 text-center ring-1 ring-line">
        <ThinkingOrb state={state} size={64} />
        <p key={text} className="rise shimmer mt-6 font-serif text-[26px] italic leading-none">
          {text}
        </p>
        <p className="label mt-3">
          {t.docCount(count)} · {t.usually}
        </p>
      </div>
    </Glow>
  );
}

export function TypingOrb() {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-2.5 text-[13px] text-muted">
      <ThinkingOrb state="working" size={20} />
      <span className="shimmer">{t.thinkingWord}</span>
    </span>
  );
}
