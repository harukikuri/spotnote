// The link to spotnote-mcp (the mcp/ package), while it runs. Then its notes
// are the truth: we send it our edits and mirror its snapshots. The dev server
// tells us when it's up ("spotnote:mcp"), so a page never polls a closed port
// (each failed attempt would print an error in the console).
export function connectRemote({ root, port, onSnapshot, onOnline }) {
  const base = `http://127.0.0.1:${port}`;
  let es = null;
  let lastV = -1; // snapshots can overtake each other: keep only newer ones

  function apply(snap) {
    if (snap.v <= lastV) return;
    lastV = snap.v;
    onSnapshot(snap.notes);
  }
  function setUp(up) {
    if (up && !es) {
      lastV = -1; // a new server counts from 0
      es = new EventSource(`${base}/events?root=${encodeURIComponent(root)}`);
      es.addEventListener("snapshot", (e) => online && apply(JSON.parse(e.data)));
      es.onopen = () => onOnline(true);
      es.onerror = () => {
        drop();
        setTimeout(() => import.meta.hot?.send("spotnote:mcp?"), 2000); // still up? then reconnect
      };
    } else if (!up && es) drop();
  }
  let online = false; // set by the caller once its offline notes are merged in
  function drop() {
    es.close();
    es = null;
    online = false;
    onOnline(false);
  }
  import.meta.hot?.on("spotnote:mcp", ({ up }) => setUp(up));
  import.meta.hot?.send("spotnote:mcp?");

  return {
    // Ops: upsert { note }, remove { key }, reply { key, text }, merge { notes }.
    async send(op) {
      if (!es) return;
      try {
        // A text/plain body keeps this a "simple" request: no CORS preflight.
        const res = await fetch(`${base}/op`, { method: "POST", body: JSON.stringify({ root, ...op }) });
        if (res.ok) {
          online = true; // the first op is the merge: from here on, snapshots are the truth
          apply(await res.json());
        }
      } catch {
        /* the server went away; the dev server will say so */
      }
    },
  };
}
