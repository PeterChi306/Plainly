# Plainly

Paperwork, in plain words. Upload a bill, lease, notice, syllabus or assignment; Plainly says what matters, what looks wrong, and what to do next — then answers questions about it.

## Run it

```bash
cp .env.example .env.local   # then paste your GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

- `PLAINLY_MOCK=1 npm run dev` shows a canned reading without a key (layout checks only).
- `/?try=bill` (or `syllabus`, `notice`, `essay`) opens straight onto a sample.
- Sample documents are fictional; edit `scripts/samples/*.html`, then `node scripts/render-samples.mjs`.

## Where things are

- `src/lib/prompts.ts` — the four modes' checks, the safety rules, the answer shape
- `src/app/api/read` — one structured reading; `src/app/api/chat` — streamed follow-ups
- `src/lib/redact.ts` — long ID numbers cut to the last 4 digits
- `src/components/` — sidebar, home, thinking orb, results, composer with voice glow

Orbs: `thinking-orbs`, voice glow: `voice-glow` (both MIT, Jakub Antalik — the same ones Chief ports).
