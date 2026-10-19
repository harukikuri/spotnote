// Frame helpers: the whole video is a function of the frame number, so every
// render is the same.
import { Easing, interpolate } from "remotion";

// Symmetric: a long, slow end to a move would creep a fraction of a pixel per
// frame, and text shimmers at that speed.
const ease = Easing.inOut(Easing.cubic);

// The value at `frame` along keyframes [[frame, value], ...], eased between them.
export function keys(frame, points) {
  const fs = points.map((p) => p[0]);
  const vs = points.map((p) => p[1]);
  return interpolate(frame, fs, vs, { easing: ease, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

// 0 → 1 over `length` frames from `start`.
export const progress = (frame, start, length) =>
  keys(frame, [
    [start, 0],
    [start + length, 1],
  ]);

// `text` as typed so far: `cps` characters a second (at 30 fps), from `start`.
// By characters, not UTF-16 units, so an emoji never shows half typed.
export function typed(frame, start, text, cps = 14) {
  const n = Math.floor(Math.max(0, frame - start) * (cps / 30));
  return Array.from(text).slice(0, n).join("");
}

export const within = (frame, from, to) => frame >= from && frame < to;
