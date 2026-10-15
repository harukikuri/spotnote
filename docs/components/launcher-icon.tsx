// The launcher, sized to sit inline in a sentence. Mirrors the client's
// `.snl-core` (plugin/src/client/launcher.js ICON, ui.js .snl-core rules):
//   closed  a glass circle with the yellow Spotnote mark
//   open    the accent (yellow) circle with its ring and a ×
//   paused  open, but back to glass, with the ×
//   done    open, with a ✓ for a moment after a prompt is copied
// Glass follows the docs theme, as the client's does its own.
type LauncherState = 'closed' | 'open' | 'paused' | 'done';

const GLASS =
  'border border-black/[.08] bg-white/90 text-[#18181b] shadow-[inset_0_1px_0_rgba(255,255,255,.7),0_2px_6px_rgba(0,0,0,.15)] ' +
  'dark:border-white/10 dark:bg-[rgba(24,24,28,.92)] dark:text-[#f2f2f3] dark:shadow-[inset_0_1px_0_rgba(255,255,255,.06),0_2px_6px_rgba(0,0,0,.25)]';
const ACCENT = 'bg-[#ffd84d] text-[#1a1600] shadow-[0_0_0_4px_rgba(255,216,77,.38),0_2px_6px_rgba(0,0,0,.25)]';

const LABEL: Record<LauncherState, string> = {
  closed: 'Spotnote launcher',
  open: 'Open Spotnote launcher',
  paused: 'Paused Spotnote launcher',
  done: 'Spotnote launcher after copying',
};

const line = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function LauncherIcon({ state = 'closed' }: { state?: LauncherState }) {
  return (
    <span
      role="img"
      aria-label={LABEL[state]}
      className={
        'mx-1 inline-grid size-[1.75em] place-items-center rounded-full align-middle ' +
        (state === 'open' || state === 'done' ? ACCENT : GLASS)
      }
    >
      {state === 'closed' && (
        <svg width="0.8em" height="0.8em" viewBox="56 56 188 188" aria-hidden="true">
          <path
            fill="#FFD84D"
            fillRule="evenodd"
            d="M56 56h188v124l-64 64H56z M150 124a26 26 0 1 0-52 0a26 26 0 1 0 52 0z"
          />
          <path fill="#D4A817" d="M244 180h-64v64z" />
        </svg>
      )}
      {(state === 'open' || state === 'paused') && (
        // The client's "+" turned 135°, which reads as "×".
        <svg width="0.85em" height="0.85em" viewBox="0 0 24 24" aria-hidden="true" className="rotate-[135deg]">
          <path {...line} d="M12 5v14M5 12h14" />
        </svg>
      )}
      {state === 'done' && (
        <svg width="0.85em" height="0.85em" viewBox="0 0 24 24" aria-hidden="true">
          <path {...line} strokeWidth={2.25} d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}
