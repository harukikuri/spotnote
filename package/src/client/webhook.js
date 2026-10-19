// The plugin's `webhook` option: each note, as it's sent (Enter, new or
// rewritten), goes to that URL in a POST. The body is JSON, sent as text/plain:
// a "simple" request, so the receiver needs no CORS setup. The page can't read
// the answer then, and needn't.
//
//   { "event": "note.add" | "note.update", "sentAt": ISO time,
//     "note": { key, text, page, targets: [{ file, line, column, instance }], prompt } }
let url = null;

export function setWebhook(u) {
  url = u;
}

export function postNote(event, note) {
  if (!url) return;
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    keepalive: true, // still sent if the page goes away right after
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ event, sentAt: new Date().toISOString(), note }),
  }).catch((e) => console.warn(`[spotnote] couldn't send the note to the webhook: ${e.message}`));
}
