import type { ModeChoice } from "./types";

/** Messages each visitor gets a day: a reading and a question both count. */
export const DAILY_MESSAGES = 5;

export const MODES: ModeChoice[] = ["auto", "money", "legal", "assignment", "syllabus"];

/** The app's languages. `id` is what the model is told; `locale` formats dates and voice. */
export const LANGUAGES = [
  { id: "English", label: "English", locale: "en-US" },
  { id: "Spanish", label: "Español", locale: "es-ES" },
  { id: "Simplified Chinese", label: "中文", locale: "zh-CN" },
  { id: "Vietnamese", label: "Tiếng Việt", locale: "vi-VN" },
  { id: "Korean", label: "한국어", locale: "ko-KR" },
  { id: "Tagalog", label: "Tagalog", locale: "fil-PH" },
  { id: "French", label: "Français", locale: "fr-FR" },
  { id: "Russian", label: "Русский", locale: "ru-RU" },
];
