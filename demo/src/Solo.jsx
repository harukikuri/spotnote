// The solo demo, frame by frame (30 fps): on the dev server, a developer
// writes a note, pastes the prompt into their agent, which changes that line,
// and the page shows it. No chat, no roles.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Browser } from "./apps/Browser.jsx";
import { Shop } from "./apps/Shop.jsx";
import { Cursor } from "./mac/Cursor.jsx";
import { VIEWPORT } from "./layout.js";
import { Desktop } from "./mac/Desktop.jsx";
import { Switcher } from "./mac/Switcher.jsx";
import { keys } from "./motion.js";
import { devPrompt, FRAMEWORKS } from "./script.js";
import {
  AgentTerminal,
  CARD_EDGE,
  Camera,
  Caption,
  click,
  KeyPresses,
  LAUNCHER_AT,
  spotnoteSteps,
  switcher,
} from "./shared.jsx";
import { Spotnote } from "./spotnote/Spotnote.jsx";

// When things happen.
const T = {
  launcher: 34, // click the launcher
  card: 94, // click the card
  type: 106, // start typing the note
  enter: 172, // send it: the prompt is copied
  toTerm: 226, // ⌘ Tab
  termFront: 256,
  pasteTerm: 274, // ⌘ V
  run: 296,
  read: 330,
  update: 366, // the file changes: the page updates (unseen, behind)
  answer: 432,
  toBrowser: 492, // ⌘ Tab back
  browserFront: 522,
  end: 612,
};
T.away = T.toBrowser; // the pointer leaves the card while away
export const SOLO_DURATION = T.end;

// `framework`: the card is written in it (React, Vue or Svelte), so its file
// and icon are that framework's.
export function Solo({ framework = "react" }) {
  const fw = FRAMEWORKS[framework];
  const f = useCurrentFrame();
  const termFront = f >= T.termFront && f < T.browserFront;
  const cx = keys(f, [
    [0, 760],
    [T.launcher - 4, LAUNCHER_AT[0]],
    [T.launcher + 14, LAUNCHER_AT[0]],
    [T.card - 8, CARD_EDGE[0]],
    [T.termFront, CARD_EDGE[0]],
    [T.termFront + 20, 1400],
    [T.browserFront, 1400],
    [T.browserFront + 24, 900],
  ]);
  const cy = keys(f, [
    [0, 430],
    [T.launcher - 4, LAUNCHER_AT[1]],
    [T.launcher + 14, LAUNCHER_AT[1]],
    [T.card - 8, CARD_EDGE[1]],
    [T.termFront, CARD_EDGE[1]],
    [T.termFront + 20, 640],
    [T.browserFront, 640],
    [T.browserFront + 24, 600],
  ]);
  const press = f < T.card - 20 ? click(f, T.launcher) : click(f, T.card);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Camera
        f={f}
        shots={[
          [0, 1, 720, 405],
          [T.launcher + 20, 1, 720, 405],
          [T.card - 4, 1.3, 430, 480],
          [T.enter + 30, 1.3, 430, 480],
          [T.toTerm - 6, 1, 720, 405],
          [T.termFront + 10, 1, 720, 405],
          [T.run + 10, 1.3, 560, 355],
          [T.answer + 40, 1.3, 560, 355],
          [T.toBrowser, 1, 720, 405],
          [T.browserFront + 6, 1, 720, 405],
          [T.browserFront + 30, 1.3, 430, 440],
        ]}
      >
        <Desktop
          wallpaper="light"
          app={termFront ? "Terminal" : "Browser"}
          menus={termFront ? ["Shell", "Edit", "View", "Window", "Help"] : ["File", "Edit", "View", "Window", "Help"]}
          time="Mon 10:24 AM"
        >
          <AgentTerminal
            f={f}
            t={T}
            prompt={devPrompt(fw)}
            fw={fw}
            front={termFront}
            style={{ zIndex: termFront ? 3 : 1, opacity: f < T.toTerm ? 0 : 1 }}
          />
          <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
            <Browser front={!termFront} url="localhost:5173" title="Acme — New arrivals">
              <Shop padding={f >= T.update ? 24 : 16} />
              <Spotnote steps={spotnoteSteps(f, T, VIEWPORT.h, fw)} frame={f} fps={30} framework={fw.kind} />
            </Browser>
          </div>
        </Desktop>
        <Cursor x={cx} y={cy} {...press} />
        <Switcher apps={["Browser", "Terminal"]} chosen="Terminal" opacity={switcher(f, T.toTerm, T.termFront)} />
        <Switcher apps={["Browser", "Terminal"]} chosen="Browser" opacity={switcher(f, T.toBrowser, T.browserFront)} />
      </Camera>
      <KeyPresses f={f} presses={PRESSES} />
      <Caption f={f} captions={CAPTIONS} />
    </AbsoluteFill>
  );
}

const PRESSES = [
  [T.enter - 6, ["↵"]],
  [T.toTerm, ["⌘", "Tab"]],
  [T.pasteTerm - 6, ["⌘", "V"]],
  [T.run - 6, ["↵"]],
  [T.toBrowser, ["⌘", "Tab"]],
];

const CAPTIONS = [
  [0, T.toTerm, "Click an element, write the change, press Enter: the prompt is copied"],
  [T.toTerm, T.toBrowser, "Paste it to your agent: it goes straight to the file and line"],
  [T.toBrowser, T.end + 8, "Back in the browser, the change is there"],
];
