import { currentLocale } from "./i18n";
import type { DateItem } from "./types";

// A calendar file every calendar app opens: all-day events unless a time
// was given, each with a reminder the day before.
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

function event(item: DateItem, i: number) {
  const day = item.date.replace(/-/g, "");
  const timed = /^\d{2}:\d{2}$/.test(item.time);
  const start = timed ? `DTSTART:${day}T${item.time.replace(":", "")}00` : `DTSTART;VALUE=DATE:${day}`;
  const next = new Date(`${item.date}T00:00:00`);
  next.setDate(next.getDate() + 1);
  const end = timed ? "" : `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`;
  return [
    "BEGIN:VEVENT",
    `UID:plainly-${day}-${i}-${Math.random().toString(36).slice(2)}@plainly`,
    `DTSTAMP:${stamp()}`,
    start,
    end,
    `SUMMARY:${esc(item.title)}`,
    item.note ? `DESCRIPTION:${esc(item.note)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(item.title)}`,
    "END:VALARM",
    "END:VEVENT",
  ].filter(Boolean);
}

export function downloadCalendar(items: DateItem[], name = "plainly-dates") {
  const valid = items.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date));
  if (valid.length === 0) return;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Plainly//EN", "CALSCALE:GREGORIAN", ...valid.flatMap(event), "END:VCALENDAR"];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function prettyDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(currentLocale(), { weekday: "short", month: "short", day: "numeric" });
}

export function daysUntil(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - now.getTime()) / 86_400_000);
}
