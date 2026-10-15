// Spotnote's buttons, sized to sit inline in a sentence or a table cell, so the
// docs show what you'll actually click. Icons and colours mirror the client
// (package/src/client/ui.js ICONS and THEMES, launcher.js ICON), in the theme
// that matches the docs.
import type { ReactNode } from 'react';

const line = (strokeWidth: number) =>
  ({
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }) as const;

const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="0.95em" height="0.95em" viewBox="0 0 24 24" aria-hidden="true" className="block">
    {children}
  </svg>
);

const ICONS = {
  // The note panel's header (ui.js ICONS).
  close: (
    <g {...line(2)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </g>
  ),
  copy: (
    <g {...line(1.7)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </g>
  ),
  trash: (
    <g {...line(1.7)}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </g>
  ),
  // The launcher's items (launcher.js ICON).
  pause: (
    <g {...line(1.75)}>
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </g>
  ),
  notes: (
    <g {...line(1.75)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 8h8M8 12h5" />
    </g>
  ),
  settings: (
    <g {...line(1.75)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </g>
  ),
};

const NAMES = {
  close: 'Close',
  copy: 'Copy',
  trash: 'Delete',
  pause: 'Pause',
  notes: 'Notes',
  settings: 'Settings',
};

// The panel's surface (ui.js THEMES: bg, border, icon).
const PANEL = 'border border-[#e4e4e7] bg-white text-[#71717a] dark:border-[#333] dark:bg-[#1a1a1a] dark:text-[#999]';
// The launcher's glass (ui.js .snl-glass).
const GLASS =
  'border border-black/[.08] bg-white/90 text-[#18181b] shadow-[0_1px_3px_rgba(0,0,0,.12)] ' +
  'dark:border-white/10 dark:bg-[rgba(24,24,28,.92)] dark:text-[#f2f2f3]';

/** A button in the note panel's header or the notes list: close, copy, trash.
 *  `count` adds the notes list's "(2)" / "(all)" after the trash icon. */
export function PanelButton({ icon, count }: { icon: 'close' | 'copy' | 'trash'; count?: string }) {
  return (
    <span
      role="img"
      aria-label={count ? `${NAMES[icon]} ${count}` : NAMES[icon]}
      className={
        'mx-0.5 inline-flex h-[1.6em] min-w-[1.6em] items-center justify-center gap-[3px] rounded-md px-1 align-middle text-[0.85em] ' +
        PANEL
      }
    >
      <Svg>{ICONS[icon]}</Svg>
      {count && <span className="font-medium leading-none">{count}</span>}
    </span>
  );
}

/** One of the three buttons the launcher fans out: pause, notes, settings. */
export function LauncherItem({ icon }: { icon: 'pause' | 'notes' | 'settings' }) {
  return (
    <span
      role="img"
      aria-label={NAMES[icon]}
      className={'mx-0.5 inline-grid size-[1.6em] place-items-center rounded-full align-middle ' + GLASS}
    >
      <Svg>{ICONS[icon]}</Svg>
    </span>
  );
}

/** The note panel's send action: "↵ Add & copy" and its variants. */
export function SendButton({ label }: { label: string }) {
  return (
    <span
      className={'mx-0.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-px align-middle text-[0.85em] ' + PANEL}
    >
      <kbd className="rounded border border-[#e4e4e7] px-1 font-mono text-[0.9em] leading-tight dark:border-[#333]">
        ↵
      </kbd>
      {label}
    </span>
  );
}
