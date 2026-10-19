// The Quick Start's two short clips, close up on the browser: picking an
// element (QuickClick), then writing its note (QuickNote).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Browser } from "./apps/Browser.jsx";
import { Shop } from "./apps/Shop.jsx";
import { card, VIEWPORT } from "./layout.js";
import { Cursor } from "./mac/Cursor.jsx";
import { Desktop } from "./mac/Desktop.jsx";
import { keys } from "./motion.js";
import { LOC } from "./script.js";
import { CARD_EDGE, Camera, click, KeyPresses, LAUNCHER_AT, spotnoteSteps, TARGET } from "./shared.jsx";
import { hover, launcher, panel, selected, Spotnote } from "./spotnote/Spotnote.jsx";

// The browser, close up (the launcher and the first cards in view).
const SHOT = [[0, 1.45, 470, 520]];
const edge = (i) => [VIEWPORT.x + card(i).x + card(i).w - 8, VIEWPORT.y + card(i).y + card(i).h / 2];

function Page({ f, steps, cursor, press }) {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Camera f={f} shots={SHOT}>
        <Desktop wallpaper="light" app="Browser" menus={["File", "Edit", "View", "Window", "Help"]} time="Mon 10:24 AM">
          <Browser front url="localhost:5173" title="Acme — New arrivals">
            <Shop />
            <Spotnote steps={steps} frame={f} fps={30} />
          </Browser>
        </Desktop>
        <Cursor x={cursor[0]} y={cursor[1]} {...press} />
      </Camera>
    </AbsoluteFill>
  );
}

// Open the launcher, move over two cards (the outline follows), click the first.
const C = { launcher: 22, over4: 52, over1: 72, card: 104 };
export const QUICK_CLICK_DURATION = 160;

export function QuickClick() {
  const f = useCurrentFrame();
  const vh = VIEWPORT.h;
  const below = { x: TARGET.x, y: TARGET.y + TARGET.h + 8 };
  const steps = [
    { at: 0, html: launcher("closed", vh) + hover(card(4), LOC, false) },
    { at: C.launcher, html: launcher("open", vh) + hover(card(4), LOC, false) },
    { at: C.over4, html: launcher("open", vh) + hover(card(4), LOC, true) },
    { at: C.over1, html: launcher("open", vh) + hover(card(1), LOC, true) },
    { at: C.card - 12, html: launcher("open", vh) + hover(TARGET, LOC, true) },
    {
      at: C.card,
      html: launcher("open", vh) + hover(TARGET, LOC, true) + selected(TARGET) + panel(below, LOC, ""),
    },
  ];
  const x = (n) =>
    keys(
      f,
      n.map(([t, p]) => [t, p[0]]),
    );
  const y = (n) =>
    keys(
      f,
      n.map(([t, p]) => [t, p[1]]),
    );
  const path = [
    [0, [LAUNCHER_AT[0] + 120, LAUNCHER_AT[1] - 60]],
    [C.launcher - 4, LAUNCHER_AT],
    [C.launcher + 8, LAUNCHER_AT],
    [C.over4, edge(4)],
    [C.over1, edge(1)],
    [C.card - 8, CARD_EDGE],
  ];
  return (
    <Page
      f={f}
      steps={steps}
      cursor={[x(path), y(path)]}
      press={f < C.card - 20 ? click(f, C.launcher) : click(f, C.card)}
    />
  );
}

// The note panel is open on the card: type the change, press Enter.
const N = { launcher: -60, card: -30, type: 14, enter: 96 };
export const QUICK_NOTE_DURATION = 190;

export function QuickNote() {
  const f = useCurrentFrame();
  return (
    <>
      <Page f={f} steps={spotnoteSteps(f, N, VIEWPORT.h)} cursor={CARD_EDGE} press={{}} />
      <KeyPresses f={f} presses={[[N.enter - 6, ["↵"]]]} />
    </>
  );
}
