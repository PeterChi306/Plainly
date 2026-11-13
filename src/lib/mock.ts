import "server-only";
import type { Reading } from "./types";

// For checking the layout without a key: PLAINLY_MOCK=1 makes /api/read
// return this instead of calling the model. Never set it in production.
export const MOCK_READING: Reading = {
  mode: "money",
  readable: true,
  problem: "",
  title: "Cedar Hollow ER bill",
  kind: "Hospital bill + EOB",
  headline: "You're being billed $616.40, but your insurance says you only owe $276.40. A $340 lab test looks charged twice.",
  detail:
    "Your insurance statement lists one metabolic panel. The hospital bill lists two, for $340 each. That extra $340 is exactly the gap between the two documents.",
  facts: [
    { label: "Bill says you owe", value: "$616.40", tone: "bad", source: "AMOUNT DUE", where: [{ doc: 1, page: 1, box: [700, 659, 730, 749] }] },
    { label: "Insurance says you owe", value: "$276.40", tone: "good", source: "You may owe $276.40", where: [] },
    { label: "Looks overcharged by", value: "$340.00", tone: "warn", source: "", where: [] },
    { label: "Pay or dispute by", value: "Nov 27", tone: "neutral", source: "11/27/2026", where: [{ doc: 1, page: 1, box: [807, 659, 823, 746] }] },
  ],
  checks: [
    { title: "Duplicate charge", verdict: "alert", detail: "The same lab test (code 80053) is listed twice on the same day.", source: "Comprehensive metabolic panel", where: [{ doc: 1, page: 1, box: [455, 302, 471, 522] }, { doc: 1, page: 1, box: [493, 302, 509, 522] }] },
    { title: "Bill vs. insurance", verdict: "warn", detail: "The bill is $340.00 higher than what your insurance says you may owe.", source: "", where: [] },
    { title: "Math on the bill", verdict: "ok", detail: "The line items add up to the total shown.", source: "Total charges", where: [] },
    { title: "Is this a scam?", verdict: "ok", detail: "Names, dates and amounts match your insurance statement. No pressure tactics.", source: "", where: [] },
  ],
  steps: [
    { text: "Don't pay the full $616.40 yet.", how: "", when: "" },
    { text: "Call the billing office and ask them to remove the duplicate lab charge.", how: "Call (555) 014-7700, Mon to Fri 8am to 5pm. Say: \"Code 80053 is billed twice on 10/06. Please remove one.\"", when: "2026-11-20" },
    { text: "Ask for a corrected bill showing $276.40.", how: "", when: "" },
  ],
  checklist: {
    title: "Before you call",
    items: ["This bill and your account number", "The insurance statement (EOB)", "A pen to write down who you spoke to"],
  },
  dates: [
    { title: "Hospital bill due", date: "2026-11-27", time: "", note: "Dispute the duplicate charge before this" },
    { title: "Insurance appeal window closes", date: "2027-04-18", time: "", note: "180 days from 10/20/2026" },
  ],
  missing: ["Whether the hospital already noticed the duplicate charge"],
  help: { needed: false, urgency: "none", reason: "", who: "", questions: [] },
  drafts: [
    { label: "Dispute letter", ask: "Write a short letter disputing the duplicate 80053 charge." },
    { label: "Phone script", ask: "Write what to say when calling the billing office." },
  ],
  questions: ["What if they won't remove it?", "Can I pay just $276.40?", "Will this hurt my credit?"],
};
