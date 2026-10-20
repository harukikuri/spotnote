// What the client's modules hand each other: notes, as spotnote-mcp sends them
// (mcp/src/types.ts) and as this browser keeps them, and the inspector's
// controller that the launcher drives.

// One element: its stamp ("src/App.jsx:12:4") and which of the elements with
// that stamp it is (0-based, in DOM order).
export interface Ref {
  loc: string;
  index: number;
}

export interface Message {
  id: string;
  from: "agent" | "you";
  text: string;
  at: number;
  resolves?: boolean;
  dismisses?: boolean;
  client?: string | null;
  pending?: boolean; // written while the agent was away: sent on reconnecting
}

// A note as spotnote-mcp's snapshots have it (and, but for `working`, as this
// browser saves it).
export interface Note extends Ref {
  key: string;
  more?: Ref[];
  url?: string;
  note: string;
  prompt?: string;
  thread?: Message[];
  done?: boolean;
  dismissed?: boolean;
  working?: { agent: string; client: string | null } | false;
  updated?: number;
}

// A note on this page: the note, its pin, and a pin on each of its other
// elements (`extra`, one per `more`).
export interface Pin extends Omit<Note, "key"> {
  marker: HTMLElement;
  extra?: (Ref & { marker: HTMLElement })[];
}

export type NoteState = "done" | "dismissed" | "asked" | "working" | "open";

// A source file's framework, for its mark.
export type FileKind = "react" | "solid" | "vue" | "svelte" | "astro" | "jsx";

// A note as the launcher's notes list shows it.
export interface ListedNote extends Ref {
  key: string;
  note: string;
  latest: string;
  targets: { loc: string; tag?: string; cls?: string | null }[];
  state: NoteState;
  mark?: string;
  client?: string | null;
  url?: string;
  here: boolean;
  lost: boolean;
}

export type McpStatus = "off" | "connecting" | "on";

// What the launcher drives the inspector with (see inspector.ts).
export interface Controller {
  toggleInspect(): void;
  setInspect(on: boolean): void;
  isInspecting(): boolean;
  setPinsVisible(visible: boolean): void;
  fileKind(file: string): FileKind;
  mcpStatus(): McpStatus;
  about: { version: string; repo: string } | null;
  notes(): ListedNote[];
  copyNote(key: string): void;
  deleteNote(key: string): void;
  openNote(key: string): void;
  onChange(cb: () => void): () => void;
}

declare global {
  // Where each file uses components: [name, line, column] for every <Component>
  // in it, set by the plugin (usesScript in ../index.ts).
  var __spotnoteUses: Record<string, [string, number, number][]> | undefined;
  interface Window {
    __spotnote?: boolean; // booted already
  }
}
