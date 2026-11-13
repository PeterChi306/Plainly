export type Mode = "money" | "legal" | "assignment" | "syllabus" | "other";
export type ModeChoice = Mode | "auto";

export type Tone = "neutral" | "good" | "warn" | "bad";
export type Verdict = "ok" | "info" | "warn" | "alert";

/** Where a quote sits: document and page (both from 1), and a box
 *  [ymin, xmin, ymax, xmax] on that page, each 0 to 1000. */
export type Spot = { doc: number; page: number; box: number[] };

export type Fact = { label: string; value: string; tone: Tone; source: string; where: Spot[] };
export type Check = { title: string; verdict: Verdict; detail: string; source: string; where: Spot[] };
export type Step = { text: string; how: string; when: string };
export type Checklist = { title: string; items: string[] };
export type DateItem = { title: string; date: string; time: string; note: string };
export type Draft = { label: string; ask: string };

export type Help = {
  needed: boolean;
  urgency: "none" | "soon" | "urgent";
  reason: string;
  who: string;
  questions: string[];
};

/** What the model makes of the documents. */
export type Reading = {
  mode: Mode;
  readable: boolean;
  problem: string;
  title: string;
  kind: string;
  headline: string;
  detail: string;
  facts: Fact[];
  checks: Check[];
  steps: Step[];
  checklist: Checklist;
  dates: DateItem[];
  missing: string[];
  help: Help;
  drafts: Draft[];
  questions: string[];
};

/** A file as it travels to the server: base64 without the data: prefix. */
export type DocFile = { name: string; type: string; data: string };

export type ChatMessage = { role: "user" | "model"; text: string };
