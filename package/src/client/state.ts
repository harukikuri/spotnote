// What the picker's modules share: the notes on this page, the selection, the
// link to spotnote-mcp, and the change signal the launcher listens to.
//   inspector.ts  boots it all; selection mode, the pointer, repositioning
//   panel.ts      the note panel
//   pins.ts       the notes, their pins, saving them, syncing with spotnote-mcp
//   overlay.ts    the hover box and label, the selection box
// They call each other's functions only at run time (on events), never while
// loading, so the imports going both ways are fine.
import type { mountLauncher } from "./launcher.ts";
import type { Remote } from "./remote.ts";
import type { Pin, Ref } from "./types.ts";

// refKey (loc@index) -> the note and its pins, in the order they're numbered.
export const pins = new Map<string, Pin>();

export const app = {
  remote: null as Remote | null, // the link to spotnote-mcp (remote.ts)
  launcher: null as ReturnType<typeof mountLauncher> | null,
  jsx: null as "react" | "solid" | null, // the JSX framework, detected by the plugin
  builtFrom: null as string | null, // in a build, the commit it's made from (the plugin says)
  pinsVisible: true, // hidden while the launcher is closed
};

// The element the open panel is on (and its box): its stamp, which of the
// elements with that stamp it is (.map() items), and the node actually clicked
// (it may be deeper, and unstamped: a dependency's markup).
export const selection = {
  el: null as HTMLElement | null,
  loc: null as string | null,
  index: 0,
  raw: null as Element | null,
};

// Something the launcher shows changed: notes, their states, selection mode.
const changeCbs: (() => void)[] = [];
export function notify(): void {
  for (const cb of changeCbs) cb();
}
export function onChange(cb: () => void): () => void {
  changeCbs.push(cb);
  return () => {
    const i = changeCbs.indexOf(cb);
    if (i >= 0) changeCbs.splice(i, 1);
  };
}

// A note's elements: the one it's keyed by, then any added with Shift-click
// (`more`). Each has a pin with the same number: `marker`, then `extra`'s.
export const targetsOf = (pin: Pin): Ref[] => [{ loc: pin.loc, index: pin.index }, ...(pin.more ?? [])];
export const sameRef = (a: Ref, b: Ref): boolean => a.loc === b.loc && a.index === b.index;
export const present = (e: HTMLElement | null): e is HTMLElement => e !== null;
export const pageUrl = (): string => location.pathname + location.search;
// Is the coding agent connected (spotnote-mcp has our notes)?
export const agentConnected = (): boolean => app.remote?.status() === "on";
