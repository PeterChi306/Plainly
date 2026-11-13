"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LANGUAGES } from "./modes";

// The browser's own speech recognition (Chrome, Edge, Safari). Words come
// back as they're heard; the composer shows them live.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const noop = () => () => {};

function engine() {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function useDictation(language: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(noop, () => Boolean(engine()), () => false);
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onText);
  useEffect(() => {
    callback.current = onText;
  }, [onText]);

  const start = useCallback(() => {
    const Ctor = engine();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = LANGUAGES.find((l) => l.id === language)?.locale ?? "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      callback.current(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  }, [language]);

  const stop = useCallback(() => {
    recognition.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recognition.current?.abort(), []);

  return { listening, supported, start, stop };
}
