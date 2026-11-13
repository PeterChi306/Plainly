# Plainly: hackathon finish plan

Due **Sunday 2026-11-15, 5 pm** (online presentation + project).

## Where it stands (Thu 2026-11-12)
Design and features are done and the user loves them. The real Gemini key is in `.env.local` and working.
- Home: one big "desk" (drop files or paste text, mode dropdown, mic); papers fall in and settle when dropped.
- Answer page: big zoomable document panel (left/right switch, full screen), reading card, facts, checks, steps, dates → calendar, letter drafts, follow-up chat.
- Voice glow when talking and while the AI thinks; orbs for thinking.
- Light/dark, sidebar (New reading, Library, Search ⌘K, language, appearance, privacy, history).
- Privacy: no database, nothing saved, long numbers cut to last 4.
- Logo: serif P with a candle-flame center, used as the P of "Plainly".

## Still to do, in order
1. **Tune the answers (today).** Run the 4 samples (`public/samples/`) + a real syllabus through the real AI; edit `src/lib/prompts.ts`.
   - Syllabus headline should lead with the next big deadline or grade weights, not the final exam.
   - No em dashes, plain words, "this looks like" for money problems, legal help banner when needed.
2. **Save the code.** `git init` + first commit (only when the user says so).
3. **Put it online (Fri).** Vercel: user runs `! npx vercel login`; add `GEMINI_API_KEY` in Vercel env (paid tier, so Google doesn't train on it). Never set `PLAINLY_MOCK` in production.
4. **Demo video + slides (Sat).** Story: hospital bill → caught a $340 double charge → wrote the dispute letter. Then syllabus → every date on the calendar. Close on privacy: "Read, then forgotten." Also cover "why not just ChatGPT": it knows what to check, it does the next step, and it keeps nothing.
5. **Final check (Sun morning).** Test the live link on a phone; submit early.

## Handy
- Dev: `npm run dev -- -p 3000` → http://localhost:3000
- Checks: `npx tsc --noEmit && npm run lint && npx next build`
- Layout testing without the AI: `PLAINLY_MOCK=1` (returns the sample hospital-bill reading).
