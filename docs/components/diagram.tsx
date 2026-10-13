'use client';

// Excalidraw diagrams. Sources live in docs/diagrams/<name>.excalidraw;
// export them to public/diagrams/<name>.svg and <name>-dark.svg
// (Excalidraw's export dialog: SVG, background off, dark mode on for -dark).
//
// The button at the top right shows the diagram full size, in a dialog that
// Esc, the × or a click outside the diagram closes.

import { useRef } from 'react';

const icon = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const EXPAND = icon('M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7');
const CLOSE = icon('M18 6 6 18M6 6l12 12');
const BUTTON =
  'inline-flex size-8 items-center justify-center rounded-md border bg-fd-background/80 text-fd-muted-foreground backdrop-blur-sm transition-colors hover:text-fd-foreground';

export function Diagram({
  name,
  alt,
  width,
  height,
}: {
  name: string;
  alt: string;
  width: number;
  height: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const img = (src: string, className: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={`m-0 h-auto ${className}`} />
  );
  const both = (className: string) => (
    <>
      {img(`/diagrams/${name}.svg`, `dark:hidden ${className}`)}
      {img(`/diagrams/${name}-dark.svg`, `hidden dark:block ${className}`)}
    </>
  );
  return (
    <figure className="not-prose group relative my-6 rounded-xl border p-4">
      {both('w-full')}
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label="Zoom in"
        title="Zoom in"
        className={`${BUTTON} absolute top-2 right-2 opacity-70 group-hover:opacity-100 focus-visible:opacity-100`}
      >
        {EXPAND}
      </button>
      <dialog
        ref={dialog}
        aria-label={alt}
        // A click on the backdrop (the dialog itself, outside its content) closes it.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="relative rounded-xl border bg-fd-background p-6 shadow-2xl">
          {both('max-h-[85vh] w-[min(92vw,1400px)] object-contain')}
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
    </figure>
  );
}
