"use client";

import type { ReactNode } from "react";
import { VoiceBeam } from "voice-glow";
import { useTheme } from "@/lib/useTheme";

// While Plainly thinks it borrows the voice glow, driven by a slow made-up
// "voice": two sines out of step, so it swells and settles like breathing
// rather than pulsing on a beat.
const thinking = () => {
  const t = performance.now() / 1000;
  return 0.42 + 0.22 * Math.sin(t * 1.9) + 0.14 * Math.sin(t * 4.7 + 1.3);
};

type Props = {
  children: ReactNode;
  /** The microphone, when the person is speaking. */
  stream?: MediaStream | null;
  listening?: boolean;
  busy?: boolean;
};

export function Glow({ children, stream = null, listening = false, busy = false }: Props) {
  const { dark } = useTheme();
  return (
    <VoiceBeam
      stream={listening ? stream : null}
      level={listening ? undefined : thinking}
      active={listening || busy}
      theme={dark ? "dark" : "light"}
      idle={0.2}
    >
      {children}
    </VoiceBeam>
  );
}
