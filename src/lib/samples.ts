import type { ModeChoice } from "./types";

// Made-up documents (fictional people and places) so anyone can try
// Plainly without uploading their own mail.
export const SAMPLES: {
  id: string;
  title: string;
  hint: string;
  mode: ModeChoice;
  files: { url: string; name: string }[];
}[] = [
  {
    id: "bill",
    title: "Hospital bill",
    hint: "+ insurance statement",
    mode: "money",
    files: [
      { url: "/samples/hospital-bill.png", name: "Hospital bill.png" },
      { url: "/samples/insurance-eob.png", name: "Insurance statement.png" },
    ],
  },
  {
    id: "syllabus",
    title: "Syllabus",
    hint: "AP Environmental Science",
    mode: "syllabus",
    files: [{ url: "/samples/syllabus.png", name: "Syllabus.png" }],
  },
  {
    id: "notice",
    title: "Rent notice",
    hint: "3-day notice",
    mode: "legal",
    files: [{ url: "/samples/rent-notice.png", name: "Rent notice.png" }],
  },
  {
    id: "essay",
    title: "Essay assignment",
    hint: "with rubric",
    mode: "assignment",
    files: [{ url: "/samples/essay-assignment.png", name: "Essay assignment.png" }],
  },
];
