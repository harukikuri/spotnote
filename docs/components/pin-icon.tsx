// A note's pin, sized to sit inline in a sentence or a table cell. Mirrors the
// client's `.sn-pin` with the default (yellow) accent, in the theme that matches
// the docs (package/src/client/ui.js: .sn-pin rules, STATE_ICONS, THEMES).
type PinState = 'number' | 'working' | 'asked' | 'done' | 'dismissed';

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const MARKS: Record<Exclude<PinState, 'number'>, React.ReactNode> = {
  done: <path {...STROKE} d="M5 12.5l4.5 4.5L19 7.5" />,
  dismissed: <path {...STROKE} d="M6 12h12" />,
  asked: (
    <g {...STROKE}>
      <path d="M8.8 8.8a3.3 3.3 0 1 1 4.6 3c-1 .5-1.4 1.2-1.4 2.4" />
      <path d="M12 19h.01" />
    </g>
  ),
  working: (
    <g fill="currentColor">
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="2.2" />
    </g>
  ),
};

// Pin face per state: accent with its ink, or the theme's surface.
const FACE: Record<PinState, string> = {
  number: 'bg-[#ffd84d] text-[#1a1600]',
  asked: 'bg-[#ffd84d] text-[#1a1600] motion-safe:animate-[sn-ask_1.6s_ease-in-out_infinite]',
  working: 'bg-white text-[#8a6a00] dark:bg-[#1a1a1a] dark:text-[#ffd84d]',
  done: 'bg-white text-[#8a6a00] dark:bg-[#1a1a1a] dark:text-[#ffd84d]',
  dismissed: 'bg-[#e4e4e7] text-[#71717a] dark:bg-[#3f3f46] dark:text-[#a1a1aa]',
};

const LABEL: Record<PinState, string> = {
  number: 'Pin with its number',
  working: 'Working pin',
  asked: 'Question pin',
  done: 'Done pin',
  dismissed: 'Dismissed pin',
};

export function PinIcon({ state = 'number', n = 1 }: { state?: PinState; n?: number }) {
  return (
    <span
      role="img"
      aria-label={LABEL[state]}
      className={
        'relative mx-0.5 inline-grid size-[22px] place-items-center rounded-full border-2 border-white align-middle ' +
        'text-[11px] leading-none font-semibold shadow-[0_2px_6px_rgba(0,0,0,.35)] ' +
        FACE[state]
      }
    >
      {state === 'number' ? (
        n
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" className="block">
          {MARKS[state]}
        </svg>
      )}
      {state === 'working' && (
        // The ring that spins around a pin an agent is working on.
        <span className="pointer-events-none absolute -inset-[5px] rounded-full border-2 border-transparent border-t-[#ffd84d] motion-safe:animate-[spin_.9s_linear_infinite]" />
      )}
    </span>
  );
}
