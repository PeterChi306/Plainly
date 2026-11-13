"use client";

import { ArrowUpIcon, MicrophoneIcon, StopIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { DAILY_MESSAGES } from "@/lib/modes";
import { useVoice } from "@/lib/useVoice";
import { Glow } from "./Glow";

type Props = {
  language: string;
  busy: boolean;
  /** Messages left today, once the server has said. */
  left: number | null;
  suggestions: string[];
  onSend: (text: string) => void;
};

export function Composer({ language, busy, left, suggestions, onSend }: Props) {
  const t = useT();
  const out = left === 0;
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice(language, setText);
  const listening = voice.listening;

  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function send(value = text) {
    const q = value.trim();
    if (!q || busy || out) return;
    if (listening) voice.stop();
    onSend(q);
    setText("");
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-4 sm:px-6 sm:pb-6">
      {suggestions.length > 0 && !text && !out && (
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="glass shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] text-ink-2 transition hover:text-ink disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <Glow stream={voice.stream} listening={listening} busy={busy}>
        <div className="glass-strong flex items-end gap-2 rounded-[24px] p-2 pl-4 ring-1 ring-line">
          <textarea
            ref={field}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            disabled={out}
            placeholder={out ? t.noneLeft : listening ? t.listening : busy ? t.writingBack : t.askFollowUp}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-muted"
          />
          {voice.supported && (
            <button
              onClick={voice.toggle}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${listening ? "bg-ink text-bg" : "text-muted hover:bg-glass hover:text-ink"}`}
              aria-label={listening ? t.stopListening : t.askAloud}
            >
              {listening ? <StopIcon size={16} weight="fill" /> : <MicrophoneIcon size={20} weight="duotone" />}
            </button>
          )}
          <button
            onClick={() => send()}
            disabled={!text.trim() || busy || out}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition hover:brightness-110 disabled:bg-line-strong disabled:text-muted"
            aria-label={t.send}
          >
            <ArrowUpIcon size={18} weight="bold" />
          </button>
        </div>
      </Glow>
      <p className="mt-2 text-center font-mono text-[10px] text-muted">
        {t.disclaimer}
        {left !== null && left > 0 && <span className={left <= 1 ? "text-warn" : ""}> · {t.left(left, DAILY_MESSAGES)}</span>}
      </p>
    </div>
  );
}
