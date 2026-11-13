// A second guard behind the prompt: long ID numbers never reach the screen.
// SSNs and runs of 8+ digits (account, member, card numbers, even when
// spaced or dashed) keep only their last four. Phone numbers and ISO dates
// look like long runs too, so they're let through by shape.
const SSN = /(?<!\d)\d{3}-\d{2}-(\d{4})(?!\d)/g;
// Lookarounds, not \b, so IDs glued to letters (BLP8830192701) are caught.
const RUN = /(?<!\d)\d(?:[ -]?\d){7,}(?!\d)/g;
const PHONE = /^(1[ -])?\d{3}[ -]\d{3}[ -]\d{4}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function redact(text: string): string {
  return text
    .replace(SSN, (_, last) => `•••-••-${last}`)
    .replace(RUN, (match: string) => {
      if (PHONE.test(match) || ISO_DATE.test(match)) return match;
      return `••••${match.replace(/\D/g, "").slice(-4)}`;
    });
}

/** Redacts every string inside a JSON-shaped value. */
export function redactDeep<T>(value: T): T {
  if (typeof value === "string") return redact(value) as T;
  if (Array.isArray(value)) return value.map(redactDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v)])) as T;
  }
  return value;
}
