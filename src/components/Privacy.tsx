"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { Logo } from "./Logo";

const ISSUES = "https://github.com/PeterChi306/Plainly/issues";

export function Privacy() {
  const t = useT();
  return (
    <div className="mx-auto max-w-[640px] px-5 pb-20 pt-8 sm:pt-14">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/" className="flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
          <ArrowLeftIcon size={14} />
          {t.back}
        </Link>
      </div>
      <p className="mt-14 font-script text-[42px] leading-none text-accent">{t.privacyTitle[0]}</p>
      <h1 className="font-serif text-[46px] leading-[1.05] tracking-tight text-ink">
        {t.privacyTitle[1]} <span className="italic">{t.privacyTitle[2]}</span>
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{t.privacyIntro}</p>
      <ul className="mt-10 divide-y divide-line overflow-hidden rounded-[24px] glass">
        {t.privacyPoints.map(([title, body]) => (
          <li key={title} className="px-6 py-5">
            <p className="text-[15px] font-medium text-ink">{title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-16 font-serif text-[32px] leading-[1.1] tracking-tight text-ink">{t.termsTitle}</h2>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[24px] glass">
        {t.termsPoints.map(([title, body]) => (
          <li key={title} className="px-6 py-5">
            <p className="text-[15px] font-medium text-ink">{title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-[14px] text-ink-2">
        {t.termsContact[0]}{" "}
        <a href={ISSUES} target="_blank" rel="noreferrer" className="text-accent underline-offset-4 hover:underline">
          {t.termsContact[1]}
        </a>
      </p>
      <p className="label mt-8 text-center">{t.tagline}</p>
    </div>
  );
}
