// What the store keeps (see store.ts for what each field means), and what a
// tool call gives back.

export interface Target {
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
}

export interface Note {
  key: string;
  loc: string;
  index: number;
  more: Target[];
  url: string;
  note: string;
  prompt: string;
  thread: Message[];
  done: boolean;
  dismissed: boolean;
  working: { agent: string; client: string | null } | false;
  reopened?: "done" | "dismissed" | null;
  asked: number;
  updated: number;
}

export interface App {
  root: string;
  notes: Note[];
  deleted: Record<string, number>; // key -> when it was deleted, in ms
}

// A note as a browser sends it: checked for key, loc and note (http.ts); the
// rest is taken as far as it fits.
export interface BrowserNote {
  key: string;
  loc: string;
  note: string;
  index?: unknown;
  more?: unknown;
  url?: unknown;
  prompt?: unknown;
  thread?: unknown;
  done?: unknown;
  dismissed?: unknown;
  asked?: unknown;
  updated?: unknown;
}

export interface ToolResult {
  text: string;
  isError?: boolean;
}
