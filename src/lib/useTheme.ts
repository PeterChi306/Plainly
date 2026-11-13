"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme";

export type ThemeChoice = "system" | "light" | "dark";

// The choice is a per-browser convenience, kept in localStorage and
// mirrored onto <html data-theme> (the layout's inline script applies it
// before the first paint so there's no flash).
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    media.removeEventListener("change", fn);
  };
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function useTheme() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  const dark = useSyncExternalStore(
    subscribe,
    () => (choice === "system" ? systemDark() : choice === "dark"),
    () => false,
  );

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Private windows: the switch still works until the tab closes.
    }
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
    listeners.forEach((fn) => fn());
  }, []);

  return { choice, dark, setChoice };
}
