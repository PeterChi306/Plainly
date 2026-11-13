// The mark is our P: a serif stem and a round bowl with a small flame of
// candlelight where the counter would be — the reading lamp left on.
// It's drawn on the cap height (100 units) so it can stand in for the P
// of the wordmark and sit exactly on the baseline.
function Glyph({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="70" y2="100">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--walnut)" />
        </linearGradient>
        <radialGradient id={`${id}-flame`} cx="43" cy="30" r="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="0.45" stopColor="var(--candle)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </radialGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        fillRule="evenodd"
        d="M2 0h39a30 30 0 0 1 0 60H23v34h7v6H0v-6h7V6H2V0Zm41 16.5a13.5 13.5 0 1 0 0 27a13.5 13.5 0 1 0 0-27Z"
      />
      <circle cx="43" cy="30" r="7" fill={`url(#${id}-flame)`} />
    </>
  );
}

/** The P on its own: favicons, the chat avatar, the phone header. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-15 -10 100 120" aria-hidden>
      <Glyph id="plainly-mark" />
    </svg>
  );
}

/** The wordmark: our P set as the first letter of "Plainly". */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-baseline font-serif leading-none tracking-tight text-ink" style={{ fontSize: size }} aria-label="Plainly">
      <svg viewBox="0 0 71 100" className="mr-[0.03em] h-[0.69em] w-auto self-baseline" aria-hidden>
        <Glyph id="plainly-word" />
      </svg>
      <span aria-hidden>lainly</span>
    </span>
  );
}
