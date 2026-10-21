// The plugin's `webhook` option: each note, as it's sent (Enter, new or
// rewritten), goes to that URL in a POST. The page can't read the answer, and
// needn't: both bodies are "simple" requests, so the receiver needs no CORS setup.
//
//   { "event": "note.add" | "note.update", "sentAt": ISO time,
//     "note": { key, text, page, targets: [{ file, line, column, instance }], commit, prompt } }
//
// commit: in a build, the commit it's made from; null on the dev server.
//
// The body is that JSON, sent as text/plain. With the `screenshot` option it's
// multipart/form-data instead: the JSON as the `payload` field, and the
// note's elements as an image file, `screenshot` (screenshot.ts).
import { screenshot, type ScreenshotOptions } from "./screenshot.ts";

let url: string | null = null;
let shots: ScreenshotOptions | null = null; // the `screenshot` option, when it's on
let warned = false; // say it once: a webhook that's down would fail every note

// keepalive (still sent if the page goes away right after) carries 64 KB at
// most: a body with a bigger image goes without it.
const KEEPALIVE_MAX = 60_000;

export function setWebhook(
  u: string | null,
  { screenshot = null }: { screenshot?: ScreenshotOptions | null } = {},
): void {
  url = u;
  shots = screenshot;
}

export function postNote(event: "note.add" | "note.update", note: unknown, els: Element[] = []): void {
  if (!url) return;
  const json = JSON.stringify({ event, sentAt: new Date().toISOString(), note });
  if (!shots) {
    send(json);
    return;
  }
  // The note goes either way: without the image when it can't be made or sent.
  screenshot(els, shots).then(
    (image) => (image ? sendWithImage(json, image) : send(json)),
    (e: Error) => {
      console.warn(`[spotnote] couldn't take the note's screenshot: ${e.message}`);
      send(json);
    },
  );
}

function send(json: string) {
  post({ keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: json }, (e) => warnOnce(e));
}

function sendWithImage(json: string, image: Blob) {
  const form = new FormData();
  form.append("payload", json);
  form.append("screenshot", image, `screenshot.${image.type.split("/")[1] ?? "png"}`);
  // The browser sets the multipart Content-Type (with its boundary) itself.
  post({ keepalive: json.length + image.size < KEEPALIVE_MAX, body: form }, () => send(json));
}

function post(init: RequestInit, onError: (e: Error) => void) {
  if (!url) return;
  fetch(url, { method: "POST", mode: "no-cors", ...init }).catch(onError);
}

function warnOnce(e: Error) {
  if (!warned) console.warn(`[spotnote] couldn't send notes to the webhook (${url}): ${e.message}`);
  warned = true;
}
