// The screenshot a note sends the webhook with (the `screenshot` option): its
// elements and the page around them, each outlined, as an image. It's drawn
// from the DOM (modern-screenshot, loaded on the first one), not taken from the
// screen, so no permission is asked; what the DOM can't redraw (<canvas>,
// <video>, images from another origin without CORS) comes out blank.

const PAD = 100; // px of the page around the elements
const MAX_WIDTH = 1000; // px wide at most: enough to read, small enough to send
const OUTLINE = "#ff375f";

export async function screenshot(els: Element[]): Promise<Blob | null> {
  if (!els.length) return null;
  // The elements' box on the page (document coordinates), with room around it.
  const boxes = els.map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height };
  });
  const doc = document.documentElement;
  const x = Math.max(0, Math.min(...boxes.map((b) => b.left)) - PAD);
  const y = Math.max(0, Math.min(...boxes.map((b) => b.top)) - PAD);
  const right = Math.min(doc.scrollWidth, Math.max(...boxes.map((b) => b.left + b.width)) + PAD);
  const bottom = Math.min(doc.scrollHeight, Math.max(...boxes.map((b) => b.top + b.height)) + PAD);
  const width = right - x;
  const height = bottom - y;
  if (width <= 0 || height <= 0) return null;
  const scale = Math.min(devicePixelRatio || 1, MAX_WIDTH / width);

  const { domToCanvas } = await import("modern-screenshot");
  // The whole page, moved so the box is at the top left, cut to the box's size.
  const canvas = await domToCanvas(doc, {
    width,
    height,
    scale,
    style: { transform: `translate(${-x}px,${-y}px)` },
    // Not Spotnote's own UI: its pins and panel would cover the page.
    filter: (node) => !(node instanceof Element && node.hasAttribute("data-spotnote-ui")),
  });
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    for (const b of boxes) ctx.strokeRect((b.left - x) * scale, (b.top - y) * scale, b.width * scale, b.height * scale);
  }
  // WebP where the browser makes it (Safari gives PNG instead).
  return new Promise((done) => canvas.toBlob(done, "image/webp", 0.85));
}
