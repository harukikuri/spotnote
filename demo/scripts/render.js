// Renders each video at twice its size, then scales it down to 1920 × 1080:
// text that moves then glides instead of stepping a pixel at a time.
//
//   pnpm render              out/demo.mp4 and out/demo-solo.mp4
//   pnpm render Solo         just that one
import { execFileSync } from "node:child_process";

const VIDEOS = { Demo: "out/demo.mp4", Solo: "out/demo-solo.mp4" };
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VIDEOS);
const run = (...args) => execFileSync("remotion", args, { stdio: "inherit" });

for (const id of ids) {
  const out = VIDEOS[id];
  if (!out) throw new Error(`No video ${id}: pick from ${Object.keys(VIDEOS).join(", ")}`);
  const big = out.replace(/\.mp4$/, "-2x.mp4");
  run("render", "src/index.jsx", id, big, "--scale=2");
  run(
    "ffmpeg",
    "-y",
    "-v",
    "error",
    "-i",
    big,
    "-vf",
    "scale=1920:1080:flags=lanczos",
    "-c:v",
    "libx264",
    "-crf",
    "16",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    out,
  );
}
