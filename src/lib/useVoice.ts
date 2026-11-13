"use client";

import { useEffect } from "react";
import { useMicrophone } from "voice-glow";
import { useDictation } from "./useDictation";

/** Dictation for the words, the microphone stream for the glow. */
export function useVoice(language: string, onText: (text: string) => void) {
  const mic = useMicrophone();
  const dictation = useDictation(language, onText);
  const { listening } = dictation;
  const { state, stop: stopMic } = mic;

  useEffect(() => {
    if (!listening && state === "live") stopMic();
  }, [listening, state, stopMic]);

  return {
    listening,
    supported: dictation.supported,
    stream: mic.stream,
    stop: dictation.stop,
    toggle() {
      if (listening) {
        dictation.stop();
      } else {
        onText("");
        dictation.start();
        mic.start();
      }
    },
  };
}
