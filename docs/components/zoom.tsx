'use client';

// A button at the top right that shows something full size, in a dialog that
// Esc, the × or a click outside it closes. Diagrams and demo videos use it.
// The full-size copy exists only while the dialog is open (a video in it would
// otherwise play unseen).

import { type ReactNode, useRef, useState } from 'react';

const icon = (d: string) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const EXPAND = icon('M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7');
const CLOSE = icon('M18 6 6 18M6 6l12 12');
const BUTTON =
  'inline-flex size-8 items-center justify-center rounded-md border bg-fd-background/80 text-fd-muted-foreground backdrop-blur-sm transition-colors hover:text-fd-foreground';

// children: what shows in the page; full: the full-size version, for the dialog.
export function Zoom({
  label,
  full,
  className = '',
  children,
}: {
  label: string;
  full: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className={`group relative ${className}`}>
      {children}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
        aria-label="Zoom in"
        title="Zoom in"
        className={`${BUTTON} absolute top-2 right-2 opacity-70 group-hover:opacity-100 focus-visible:opacity-100`}
      >
        {EXPAND}
      </button>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Esc closes a <dialog> natively */}
      <dialog
        ref={dialog}
        aria-label={label}
        onClose={() => setOpen(false)}
        // A click on the backdrop (the dialog itself, outside its content) closes it.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="not-prose relative rounded-xl border bg-fd-background p-6 shadow-2xl">
          {open && full}
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            title="Close"
            className={`${BUTTON} absolute top-2 right-2`}
          >
            {CLOSE}
          </button>
        </div>
      </dialog>
    </div>
  );
}
