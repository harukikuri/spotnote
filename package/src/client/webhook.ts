// The plugin's `webhook` option: each note, as it's sent (Enter, new or
// rewritten), goes to that URL in a POST. The body is JSON, sent as text/plain:
// a "simple" request, so the receiver needs no CORS setup. The page can't read
// the answer then, and needn't.
//
//   { "event": "note.add" | "note.update", "sentAt": ISO time,
//     "note": { key, text, page, targets: [{ file, line, column, instance }], commit, prompt } }
//
// commit: in a build, the commit it's made from; null on the dev server.
let url: string | null = null;
let warned = false; // say it once: a webhook that's down would fail every note

export function setWebhook(u: string | null): void {
  url = u;
}

export function postNote(event: "note.add" | "note.update", note: unknown): void {
  if (!url) return;
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    keepalive: true, // still sent if the page goes away right after
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ event, sentAt: new Date().toISOString(), note }),
  }).catch((e: Error) => {
    if (!warned) console.warn(`[spotnote] couldn't send notes to the webhook (${url}): ${e.message}`);
    warned = true;
  });
}
