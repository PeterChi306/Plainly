"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Fragment, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { redact } from "@/lib/redact";

// Just enough markdown for chat answers: paragraphs, bullets, numbers,
// checklists ("- [ ] "), bold, and letters fenced by "---" lines, which
// become a card to copy.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-medium text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part.replace(/(^|\s)\*(\S[^*]*\S)\*/g, "$1$2")}</Fragment>
    ),
  );
}

const BOX = /^\[( |x|X)\]\s+/;

function Checklist({ items }: { items: string[] }) {
  const [done, setDone] = useState(() => items.map((item) => /^\[[xX]\]/.test(item)));
  return (
    <ul className="my-2.5 overflow-hidden rounded-[16px] bg-glass ring-1 ring-line">
      {items.map((item, i) => (
        <li key={i} className="border-b border-line last:border-0">
          <button
            onClick={() => setDone((d) => items.map((_, j) => (j === i ? !d[j] : Boolean(d[j]))))}
            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-glass"
            aria-pressed={done[i]}
          >
            <span
              className={`mt-[3px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[5px] ring-1 transition ${done[i] ? "bg-accent text-on-accent ring-accent" : "ring-line-strong"}`}
            >
              {done[i] && <CheckIcon size={11} weight="bold" />}
            </span>
            <span className={done[i] ? "text-muted line-through decoration-line-strong" : ""}>{inline(item.replace(BOX, ""))}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Blocks({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    if (!list.ordered && list.items.every((item) => BOX.test(item))) {
      out.push(<Checklist key={out.length} items={list.items} />);
      list = null;
      return;
    }
    const Tag = list.ordered ? "ol" : "ul";
    out.push(
      <Tag key={out.length} className={`my-2 space-y-1 pl-5 ${list.ordered ? "list-decimal" : "list-disc"} marker:text-muted`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const number = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (bullet || number) {
      const ordered = Boolean(number);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? number)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const heading = line.match(/^#+\s+(.*)/);
    out.push(
      <p key={out.length} className={heading ? "mt-3 font-medium text-ink" : "my-2"}>
        {inline(heading ? heading[1] : line)}
      </p>,
    );
  }
  flush();
  return <>{out}</>;
}

function Letter({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  // A letter is pasted as is, so markdown bold would arrive as asterisks.
  const plain = text.trim().replace(/\*\*([^*\n]+)\*\*/g, "$1");
  return (
    <div className="relative my-3 rounded-[18px] bg-solid px-5 py-5 shadow-[0_12px_32px_-18px_rgba(60,40,20,0.4)] ring-1 ring-line">
      <button
        onClick={() => {
          navigator.clipboard.writeText(plain);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-glass-strong px-3 py-1 text-[12px] text-ink-2 ring-1 ring-line transition hover:text-ink"
      >
        {copied ? <CheckIcon size={13} weight="bold" /> : <CopyIcon size={13} weight="duotone" />}
        {copied ? t.copied : t.copy}
      </button>
      <p className="label mb-3">{t.readyToSend}</p>
      <div className="whitespace-pre-wrap font-serif text-[16px] leading-relaxed text-ink">{plain}</div>
    </div>
  );
}

export function ModelText({ text }: { text: string }) {
  const safe = redact(text);
  const parts = safe.split(/^-{3,}\s*$/m);
  return (
    <div className="text-[14.5px] leading-relaxed text-ink-2">
      {parts.map((part, i) => (i % 2 === 1 && i < parts.length - 1 ? <Letter key={i} text={part} /> : <Blocks key={i} text={part} />))}
    </div>
  );
}
