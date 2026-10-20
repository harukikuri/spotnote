// The link to spotnote-mcp (the mcp/ package), while it runs. Then its notes
// are the truth: we send it our edits and mirror its snapshots. The dev server
// tells us when it's up ("spotnote:mcp"), so a page never polls a closed port
// (each failed attempt would print an error in the console).
//
// status: "off" (not running), "connecting", or "on" (our notes are synced).
import type { McpStatus, Note } from "./types.ts";

// What the page sends spotnote-mcp. A note goes as the server keeps it, but for
// `working`, which only the server sets.
export type Op =
  | { op: "upsert"; note: Omit<Note, "working"> }
  | { op: "remove"; key: string }
  | { op: "reply"; key: string; text: string }
  | { op: "merge"; notes: Omit<Note, "working">[] };

export interface Remote {
  status(): McpStatus;
  send(op: Op): Promise<void>;
}

export function connectRemote({
  root,
  port,
  onSnapshot,
  onOnline,
  onStatus,
}: {
  root: string;
  port: number;
  onSnapshot: (notes: Note[]) => void;
  onOnline: (on: boolean) => void;
  onStatus?: (status: McpStatus) => void;
}): Remote {
  const base = `http://127.0.0.1:${port}`;
  let es: EventSource | null = null;
  let status: McpStatus = "off";
  const setStatus = (s: McpStatus) => s !== status && onStatus?.((status = s));
  let lastV = -1; // snapshots can overtake each other: keep only newer ones

  function apply(snap: { v: number; notes: Note[] }) {
    if (snap.v <= lastV) return;
    lastV = snap.v;
    onSnapshot(snap.notes);
  }
  function setUp(up: boolean) {
    if (up && !es) {
      lastV = -1; // a new server counts from 0
      setStatus("connecting");
      es = new EventSource(`${base}/events?root=${encodeURIComponent(root)}`);
      es.addEventListener("snapshot", (e) => online && apply(JSON.parse((e as MessageEvent<string>).data)));
      es.onopen = () => onOnline(true);
      es.onerror = () => {
        drop();
        setTimeout(() => import.meta.hot?.send("spotnote:mcp?"), 2000); // still up? then reconnect
      };
    } else if (!up && es) drop();
  }
  let online = false; // set by the caller once its offline notes are merged in
  function drop() {
    es?.close();
    es = null;
    online = false;
    setStatus("off");
    onOnline(false);
  }
  import.meta.hot?.on("spotnote:mcp", ({ up }: { up: boolean }) => setUp(up));
  import.meta.hot?.send("spotnote:mcp?");

  return {
    status: () => status,
    // Ops: upsert { note }, remove { key }, reply { key, text }, merge { notes }.
    async send(op) {
      if (!es) return;
      try {
        // A text/plain body keeps this a "simple" request: no CORS preflight.
        const res = await fetch(`${base}/op`, { method: "POST", body: JSON.stringify({ root, ...op }) });
        if (res.ok) {
          online = true; // the first op is the merge: from here on, snapshots are the truth
          setStatus("on");
          apply(await res.json());
        }
      } catch {
        /* the server went away; the dev server will say so */
      }
    },
  };
}
