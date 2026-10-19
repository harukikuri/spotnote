// The demo, frame by frame (30 fps): a designer writes a note on the staging
// site, pastes it to the team's chat; a developer copies it into their agent,
// which changes that line.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Browser } from "./apps/Browser.jsx";
import { Avatar, Chat } from "./apps/Chat.jsx";
import { Shop } from "./apps/Shop.jsx";
import { Diff, Step, Terminal, UserPrompt } from "./apps/Terminal.jsx";
import { card, CHAT, SCREEN, VIEWPORT } from "./layout.js";
import { Cursor } from "./mac/Cursor.jsx";
import { Desktop } from "./mac/Desktop.jsx";
import { Keys } from "./mac/Keys.jsx";
import { Switcher } from "./mac/Switcher.jsx";
import { keys, progress, typed } from "./motion.js";
import { CHANNEL, DESIGNER, DEVELOPER, LOC, NOTE, PM, PROMPT } from "./script.js";
import { hover, launcher, panel, pin, selected, Spotnote } from "./spotnote/Spotnote.jsx";

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

const TARGET = card(0);
const MESSAGE = "Card padding feels tight on stg 👇";
const PASTED = `[Pasted text #1 +${PROMPT.split("\n").length} lines]`;
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
      <KeyPresses f={f} />
      <Caption f={f} />
    </AbsoluteFill>
  );
}

// Zoom: [frame, scale, focus x, focus y] keyframes, in desktop pixels. Hold
// still between moves: a slow drift moves text by a fraction of a pixel each
// frame, and it shimmers. (The video is rendered at twice its size and scaled
// down, so text that moves glides instead of stepping a pixel at a time.)
function Camera({ f, shots, children }) {
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
const click = (f, at) => ({ press: f >= at - 3 && f < at + 4 ? 1 : 0, ring: progress(f, at, 12) * (f >= at ? 1 : 0) });

function DesignerMac({ f }) {
  const chatFront = f >= F.chatFront;
  const launcherAt = [VIEWPORT.x + 44, VIEWPORT.y + VIEWPORT.h - 44];
  const cardEdge = [VIEWPORT.x + TARGET.x + TARGET.w - 8, VIEWPORT.y + TARGET.y + TARGET.h / 2];
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

  // Spotnote, step by step, as the client changes it (the launcher's ✓ shows
  // for 1.2 s, the panel takes .12 s to close).
  const vh = VIEWPORT.h;
  const note = typed(f, F.type, NOTE);
  const below = { x: TARGET.x, y: TARGET.y + TARGET.h + 8 };
  const spotnote = [
    { at: 0, html: launcher("closed", vh) + hover(TARGET, LOC, false) },
    { at: F.launcher, html: launcher("open", vh) + hover(TARGET, LOC, false) },
    { at: F.card - 22, html: launcher("open", vh) + hover(TARGET, LOC, true) },
    { at: F.card, html: launcher("open", vh) + hover(TARGET, LOC, true) + selected(TARGET) + panel(below, LOC, note) },
    {
      at: F.enter,
      html: launcher("done", vh) + hover(TARGET, LOC, true) + panel(below, LOC, note, true) + pin(TARGET),
    },
    { at: F.enter + 4, html: launcher("done", vh) + hover(TARGET, LOC, true) + pin(TARGET) },
    { at: F.enter + 36, html: launcher("after", vh) + hover(TARGET, LOC, true) + pin(TARGET) },
  ];

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
        wallpaper="designer"
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
            <Shop />
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
  const caret = Math.floor(f / 15) % 2 === 0;

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
        wallpaper="developer"
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
        <Terminal
          front={termFront}
          cwd="~/acme-shop"
          input={f >= F.pasteTerm && f < F.run ? PASTED : ""}
          caret={f < F.run && caret}
          spinner={f >= F.run && f < F.answer ? `✻ ${f < F.read ? "Thinking…" : "Editing…"}` : null}
          style={{ zIndex: 2, opacity: f < F.toTerm ? 0 : 1 }}
        >
          {f >= F.run && <UserPrompt text={PASTED} />}
          {f >= F.read && <Step title="Read(src/components/ProductCard.jsx)" detail="Read 24 lines" />}
          {f >= F.update && (
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
          {f >= F.answer && (
            <div style={{ marginTop: 12 }}>
              <span style={{ color: "#e6e6e6" }}>⏺</span> The product card's padding is now 24px (it was 16px), at
              src/components/ProductCard.jsx:7.
            </div>
          )}
        </Terminal>
      </Desktop>
      <Cursor x={cx} y={cy} press={f >= F.select - 6 && f < F.select + 14 ? 1 : 0} />
      <Switcher apps={["Chat", "Terminal", "Browser"]} chosen="Terminal" opacity={switcher(f, F.toTerm, F.termFront)} />
    </Camera>
  );
}

// The ⌘ Tab switcher: fades in, holds, fades out as the app comes forward.
const switcher = (f, from, to) =>
  f < from || f >= to + 6 ? 0 : f < to ? progress(f, from, 5) : 1 - progress(f, to, 6);

// Keycaps for the shortcuts, while they're pressed.
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
function KeyPresses({ f }) {
  const on = PRESSES.findLast(([t]) => f >= t && f < t + 26);
  if (!on) return null;
  const [t, k] = on;
  return <Keys keys={k} opacity={f < t + 20 ? progress(f, t, 4) : 1 - progress(f, t + 20, 6)} />;
}

// What's happening, in a line at the top.
const CAPTIONS = [
  [CARD, F.toChat, "On the staging site: click an element, write the change, press Enter"],
  [F.toChat, F.devCard, "The prompt is on the clipboard: paste it to your team"],
  [F.dev, F.termFront, "Copies the note from the chat"],
  [F.termFront, F.end + 8, "Pastes it to the agent: it goes straight to the file and line"],
];
// Each starts with whose side it is (the designer's, until the developer's card).
function Caption({ f }) {
  const c = CAPTIONS.find(([a, b]) => f >= a && f < b);
  if (!c) return null;
  const [a, b, text] = c;
  const [who, job] = a < F.devCard ? [DESIGNER, "Designer"] : [DEVELOPER, "Developer"];
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
        padding: "8px 26px 8px 8px",
        borderRadius: 999,
        background: "rgba(20,20,22,.82)",
        color: "#fff",
        font: "500 26px -apple-system, system-ui, sans-serif",
        whiteSpace: "nowrap",
        boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 16px",
          borderRadius: 999,
          background: who.color,
          fontWeight: 700,
        }}
      >
        {job}
      </span>
      {text}
    </div>
  );
}

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
