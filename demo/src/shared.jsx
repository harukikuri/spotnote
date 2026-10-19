// What both videos use: the camera, clicks, the app switcher, keycaps and
// captions, Spotnote's steps for a note on the card, and the agent's run.
import { Diff, Step, Terminal, UserPrompt } from "./apps/Terminal.jsx";
import { card, SCREEN, VIEWPORT } from "./layout.js";
import { Keys } from "./mac/Keys.jsx";
import { keys, progress, typed } from "./motion.js";
import { LOC, NOTE } from "./script.js";
import { hover, launcher, panel, pin, selected } from "./spotnote/Spotnote.jsx";

// The card the note is on, and where the pointer goes for it, on the desktop.
export const TARGET = card(0);
export const LAUNCHER_AT = [VIEWPORT.x + 44, VIEWPORT.y + VIEWPORT.h - 44];
export const CARD_EDGE = [VIEWPORT.x + TARGET.x + TARGET.w - 8, VIEWPORT.y + TARGET.y + TARGET.h / 2];

// Zoom: [frame, scale, focus x, focus y] keyframes, in desktop pixels. Hold
// still between moves: a slow drift moves text by a fraction of a pixel each
// frame, and it shimmers. (The video is rendered at twice its size and scaled
// down, so text that moves glides instead of stepping a pixel at a time.)
export function Camera({ f, shots, children }) {
  const s = keys(
    f,
    shots.map(([t, z]) => [t, z]),
  );
  const fx = keys(
    f,
    shots.map(([t, , x]) => [t, x]),
  );
  const fy = keys(
    f,
    shots.map(([t, , , y]) => [t, y]),
  );
  const clamp = (v, min) => Math.min(0, Math.max(min, v));
  const tx = clamp(SCREEN.w / 2 - fx * s, SCREEN.w - SCREEN.w * s);
  const ty = clamp(SCREEN.h / 2 - fy * s, SCREEN.h - SCREEN.h * s);
  return (
    <div
      style={{
        position: "absolute",
        width: SCREEN.w,
        height: SCREEN.h,
        transformOrigin: "0 0",
        transform: `scale(${SCREEN.scale}) translate(${tx}px, ${ty}px) scale(${s})`,
      }}
    >
      {children}
    </div>
  );
}

// A click at `at`: the pointer presses, a ring spreads.
export const click = (f, at) => ({
  press: f >= at - 3 && f < at + 4 ? 1 : 0,
  ring: progress(f, at, 12) * (f >= at ? 1 : 0),
});

// The ⌘ Tab switcher: fades in, holds, fades out as the app comes forward.
export const switcher = (f, from, to) =>
  f < from || f >= to + 6 ? 0 : f < to ? progress(f, from, 5) : 1 - progress(f, to, 6);

// Keycaps for the shortcuts, while they're pressed: presses [[frame, keys]].
export function KeyPresses({ f, presses }) {
  const on = presses.findLast(([t]) => f >= t && f < t + 26);
  if (!on) return null;
  const [t, k] = on;
  return <Keys keys={k} opacity={f < t + 20 ? progress(f, t, 4) : 1 - progress(f, t + 20, 6)} />;
}

// What's happening, in a line at the bottom: captions [[from, to, text, badge?]],
// where a badge ({ label, color }) says whose side it is.
export function Caption({ f, captions }) {
  const c = captions.find(([a, b]) => f >= a && f < b);
  if (!c) return null;
  const [a, b, text, badge] = c;
  const o = Math.min(progress(f, a, 8), 1 - progress(f, b - 8, 8));
  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        left: "50%",
        transform: `translateX(-50%) translateY(${(1 - o) * -6}px)`,
        opacity: o,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: badge ? "8px 26px 8px 8px" : "12px 26px",
        borderRadius: 999,
        background: "rgba(20,20,22,.82)",
        color: "#fff",
        font: "500 26px -apple-system, system-ui, sans-serif",
        whiteSpace: "nowrap",
        boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      }}
    >
      {badge && (
        <span style={{ padding: "6px 16px", borderRadius: 999, background: badge.color, fontWeight: 700 }}>
          {badge.label}
        </span>
      )}
      {text}
    </div>
  );
}

// Spotnote, step by step, for the note on the card, as the client changes it
// (the launcher's ✓ shows for 1.2 s, the panel takes .12 s to close). t: the
// frames of { launcher, card, type, enter } — open, click the card, start
// typing, send — and `away`, when the pointer leaves the card (if it does).
export function spotnoteSteps(f, t, vh) {
  const note = typed(f, t.type, NOTE);
  const below = { x: TARGET.x, y: TARGET.y + TARGET.h + 8 };
  const steps = [
    { at: 0, html: launcher("closed", vh) + hover(TARGET, LOC, false) },
    { at: t.launcher, html: launcher("open", vh) + hover(TARGET, LOC, false) },
    { at: t.card - 22, html: launcher("open", vh) + hover(TARGET, LOC, true) },
    { at: t.card, html: launcher("open", vh) + hover(TARGET, LOC, true) + selected(TARGET) + panel(below, LOC, note) },
    {
      at: t.enter,
      html: launcher("done", vh) + hover(TARGET, LOC, true) + panel(below, LOC, note, true) + pin(TARGET),
    },
    { at: t.enter + 4, html: launcher("done", vh) + hover(TARGET, LOC, true) + pin(TARGET) },
    { at: t.enter + 36, html: launcher("after", vh) + hover(TARGET, LOC, true) + pin(TARGET) },
  ];
  if (t.away) steps.push({ at: t.away, html: launcher("after", vh) + hover(TARGET, LOC, false) + pin(TARGET) });
  return steps;
}

// The agent in a terminal, given the pasted prompt: t holds the frames of
// { pasteTerm, run, read, update, answer }.
export function AgentTerminal({ f, t, prompt, front, style }) {
  const pasted = `[Pasted text #1 +${prompt.split("\n").length} lines]`;
  const caret = Math.floor(f / 15) % 2 === 0;
  return (
    <Terminal
      front={front}
      cwd="~/acme-shop"
      input={f >= t.pasteTerm && f < t.run ? pasted : ""}
      caret={f < t.run && caret}
      spinner={f >= t.run && f < t.answer ? `✻ ${f < t.read ? "Thinking…" : "Editing…"}` : null}
      style={style}
    >
      {f >= t.run && <UserPrompt text={pasted} />}
      {f >= t.read && <Step title="Read(src/components/ProductCard.jsx)" detail="Read 24 lines" />}
      {f >= t.update && (
        <Step
          title="Update(src/components/ProductCard.jsx)"
          detail="Updated src/components/ProductCard.jsx with 1 addition and 1 removal"
        >
          <Diff
            lines={[
              [6, " ", "  return ("],
              [7, "-", '    <div className="card" style={{ padding: 16 }}>'],
              [7, "+", '    <div className="card" style={{ padding: 24 }}>'],
              [8, " ", '      <img src={product.image} alt="" />'],
            ]}
          />
        </Step>
      )}
      {f >= t.answer && (
        <div style={{ marginTop: 12 }}>
          <span style={{ color: "#e6e6e6" }}>⏺</span> The product card's padding is now 24px (it was 16px), at
          src/components/ProductCard.jsx:7.
        </div>
      )}
    </Terminal>
  );
}
