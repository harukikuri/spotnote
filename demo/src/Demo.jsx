// The team demo, frame by frame (30 fps): a designer writes a note on the
// staging site, pastes it to the team's chat; a developer copies it into their
// agent, which changes that line. (Solo.jsx: one developer, no chat.)
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Browser } from "./apps/Browser.jsx";
import { Avatar, Chat } from "./apps/Chat.jsx";
import { Shop } from "./apps/Shop.jsx";
import { CHAT, VIEWPORT } from "./layout.js";
import { Cursor } from "./mac/Cursor.jsx";
import { Desktop } from "./mac/Desktop.jsx";
import { Switcher } from "./mac/Switcher.jsx";
import { keys, progress, typed } from "./motion.js";
import { CHANNEL, DESIGNER, DEVELOPER, PM, PROMPT } from "./script.js";
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

// When things happen. Each side opens with a card saying whose Mac it is.
const CARD = 36; // frames a role card shows
const F = {
  launcher: CARD + 34, // click the launcher
  card: CARD + 94, // click the card
  type: CARD + 106, // start typing the note
  enter: CARD + 172, // send it: the prompt is copied
  toChat: CARD + 226, // ⌘ Tab
  chatFront: CARD + 256,
  composer: CARD + 286, // click the message box
  typeMsg: CARD + 294,
  paste: CARD + 358, // ⌘ V
  send: CARD + 392,
  devCard: CARD + 440, // the developer's card comes up
  dev: 2 * CARD + 446, // the developer's Mac
  select: 2 * CARD + 480, // select the pasted prompt
  copy: 2 * CARD + 504, // ⌘ C
  toTerm: 2 * CARD + 532,
  termFront: 2 * CARD + 560,
  pasteTerm: 2 * CARD + 578,
  run: 2 * CARD + 600,
  read: 2 * CARD + 634,
  update: 2 * CARD + 670,
  answer: 2 * CARD + 736,
  end: 2 * CARD + 806,
};
export const DURATION = F.end;

const MESSAGE = "Card padding feels tight on stg 👇";
const EARLIER = [
  { id: "a", who: DEVELOPER, time: "10:02 AM", text: "New hero copy is live on stg 🎉" },
  { id: "b", who: PM, time: "10:05 AM", text: "Nice, looks good on mobile too." },
];
const POSTED = { id: "p", who: DESIGNER, time: "10:24 AM", text: MESSAGE, code: PROMPT };

export function Demo() {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {f < F.devCard + 12 ? <DesignerMac f={f} /> : <DeveloperMac f={f} />}
      <RoleCard f={f} from={0} person={DESIGNER} job="Designer" line="Reviews the staging site" />
      <RoleCard f={f} from={F.devCard} person={DEVELOPER} job="Developer" line="Gets the note in the team chat" />
      <KeyPresses f={f} presses={PRESSES} />
      <Caption f={f} captions={CAPTIONS} />
    </AbsoluteFill>
  );
}

function DesignerMac({ f }) {
  const chatFront = f >= F.chatFront;
  const [launcherAt, cardEdge] = [LAUNCHER_AT, CARD_EDGE];
  const composer = [CHAT.x + 560, CHAT.y + CHAT.h - 70];
  const cx = keys(f, [
    [0, 760],
    [F.launcher - 4, launcherAt[0]],
    [F.launcher + 14, launcherAt[0]],
    [F.card - 8, cardEdge[0]],
    [F.chatFront, cardEdge[0]],
    [F.composer - 4, composer[0]],
  ]);
  const cy = keys(f, [
    [0, 430],
    [F.launcher - 4, launcherAt[1]],
    [F.launcher + 14, launcherAt[1]],
    [F.card - 8, cardEdge[1]],
    [F.chatFront, cardEdge[1]],
    [F.composer - 4, composer[1]],
  ]);
  const press = f < F.chatFront ? (f < F.card - 20 ? click(f, F.launcher) : click(f, F.card)) : click(f, F.composer);

  const spotnote = spotnoteSteps(f, F, VIEWPORT.h);

  // The chat, behind the browser until ⌘ Tab.
  const draft =
    f < F.composer
      ? null
      : f < F.send
        ? { text: typed(f, F.typeMsg, MESSAGE, 20), code: f >= F.paste ? PROMPT : null, caret: f < F.paste }
        : null;
  const messages = f < F.send ? EARLIER : [...EARLIER, POSTED];

  return (
    <Camera
      f={f}
      shots={[
        [0, 1, 720, 405],
        [F.launcher + 20, 1, 720, 405],
        [F.card - 4, 1.3, 430, 480],
        [F.enter + 30, 1.3, 430, 480],
        [F.toChat - 6, 1, 720, 405],
        [F.composer + 6, 1, 720, 405],
        [F.paste + 2, 1.2, 760, 450],
        [F.dev, 1.2, 760, 450],
      ]}
    >
      <Desktop
        wallpaper="light"
        app={chatFront ? "Chat" : "Browser"}
        menus={["File", "Edit", "View", "Window", "Help"]}
        time="Mon 10:24 AM"
      >
        <Chat
          front={chatFront}
          me={DESIGNER}
          channel={CHANNEL}
          messages={messages}
          draft={draft}
          style={{ zIndex: chatFront ? 3 : 1 }}
        />
        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <Browser front={!chatFront} url="stg.acme-shop.com" title="[STG] Acme — New arrivals">
            <Shop staging />
            <Spotnote steps={spotnote} frame={f} fps={30} />
          </Browser>
        </div>
      </Desktop>
      <Cursor x={cx} y={cy} {...press} />
      <Switcher apps={["Browser", "Chat", "Terminal"]} chosen="Chat" opacity={switcher(f, F.toChat, F.chatFront)} />
    </Camera>
  );
}

function DeveloperMac({ f }) {
  const termFront = f >= F.termFront;
  const codeAt = [CHAT.x + 520, CHAT.y + 260];
  const cx = keys(f, [
    [F.dev, 900],
    [F.select - 6, codeAt[0]],
    [F.select + 14, codeAt[0] + 260],
    [F.termFront, codeAt[0] + 260],
    [F.termFront + 20, 1400],
  ]);
  const cy = keys(f, [
    [F.dev, 600],
    [F.select - 6, codeAt[1]],
    [F.select + 14, codeAt[1] + 330],
    [F.termFront, codeAt[1] + 330],
    [F.termFront + 20, 640],
  ]);

  return (
    <Camera
      f={f}
      shots={[
        [F.dev, 1, 720, 405],
        [F.termFront + 10, 1, 720, 405],
        [F.run + 10, 1.3, 560, 355],
        [F.answer + 50, 1.3, 560, 355],
      ]}
    >
      <Desktop
        wallpaper="dark"
        app={termFront ? "Terminal" : "Chat"}
        menus={["Shell", "Edit", "View", "Window", "Help"]}
        time="Mon 10:31 AM"
      >
        <Chat
          front={!termFront}
          me={DEVELOPER}
          channel={CHANNEL}
          messages={[...EARLIER, POSTED]}
          selected={f >= F.select ? "p" : null}
          style={{ zIndex: termFront ? 1 : 3 }}
        />
        <AgentTerminal
          f={f}
          t={F}
          prompt={PROMPT}
          front={termFront}
          style={{ zIndex: 2, opacity: f < F.toTerm ? 0 : 1 }}
        />
      </Desktop>
      <Cursor x={cx} y={cy} press={f >= F.select - 6 && f < F.select + 14 ? 1 : 0} />
      <Switcher apps={["Chat", "Terminal", "Browser"]} chosen="Terminal" opacity={switcher(f, F.toTerm, F.termFront)} />
    </Camera>
  );
}

const PRESSES = [
  [F.enter - 6, ["↵"]],
  [F.toChat, ["⌘", "Tab"]],
  [F.paste - 6, ["⌘", "V"]],
  [F.send - 6, ["↵"]],
  [F.copy - 6, ["⌘", "C"]],
  [F.toTerm, ["⌘", "Tab"]],
  [F.pasteTerm - 6, ["⌘", "V"]],
  [F.run - 6, ["↵"]],
];
// Each caption starts with whose side it is.
const AS_DESIGNER = { label: "Designer", color: DESIGNER.color };
const AS_DEVELOPER = { label: "Developer", color: DEVELOPER.color };
const CAPTIONS = [
  [CARD, F.toChat, "On the staging site: click an element, write the change, press Enter", AS_DESIGNER],
  [F.toChat, F.devCard, "The prompt is on the clipboard: paste it to your team", AS_DESIGNER],
  [F.dev, F.termFront, "Copies the note from the chat", AS_DEVELOPER],
  [F.termFront, F.end + 8, "Pastes it to the agent: it goes straight to the file and line", AS_DEVELOPER],
];
// The card that opens a side: who, and what they do. Over the scene, for CARD frames.
function RoleCard({ f, from, person, job, line }) {
  if (f < from || f >= from + CARD) return null;
  const o = Math.min(from === 0 ? 1 : progress(f, from, 6), 1 - progress(f, from + CARD - 8, 8));
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: "rgba(12,12,14,.72)",
        backdropFilter: "blur(14px)",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        color: "#fff",
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}
    >
      <Avatar person={person} size={120} />
      <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>{job}</div>
      <div style={{ fontSize: 30, opacity: 0.75 }}>{line}</div>
    </AbsoluteFill>
  );
}
