// The webhook demo, frame by frame (30 fps): the staging site and the team's
// chat side by side. A note sent on the site lands in the chat by itself,
// posted by the webhook (through a relay like the Webhook guide's).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import mark from "../../docs/public/brand/spotnote-mark-yellow.svg";
import { Browser } from "./apps/Browser.jsx";
import { Chat } from "./apps/Chat.jsx";
import { Shop } from "./apps/Shop.jsx";
import { VIEWPORT } from "./layout.js";
import { Cursor } from "./mac/Cursor.jsx";
import { Desktop } from "./mac/Desktop.jsx";
import { keys, progress } from "./motion.js";
import { CHANNEL, DESIGNER, DEVELOPER, NOTE, PM, PROMPT } from "./script.js";
import { CARD_EDGE, Camera, Caption, click, KeyPresses, LAUNCHER_AT, spotnoteSteps } from "./shared.jsx";
import { Spotnote } from "./spotnote/Spotnote.jsx";

// When things happen.
const T = {
  launcher: 30, // click the launcher
  card: 90, // click the card
  type: 102, // start typing the note
  enter: 168, // send it: the webhook posts it
  arrive: 184, // in the chat
  end: 330,
};
export const WEBHOOK_DURATION = T.end;

// The browser, drawn at its usual size and scaled into the left of the screen;
// the chat, narrow, on the right.
const S = 0.7;
const AT = { x: -18, y: 120 };
const onScreen = ([x, y]) => [AT.x + x * S, AT.y + y * S];
const CHAT_AT = { x: 958, y: 120 + 45 * S, w: 462, h: 740 * S };

const SPOTNOTE = { name: "Spotnote", icon: mark, color: "#fff7d6", app: true };
const EARLIER = [
  { id: "a", who: DEVELOPER, time: "10:02 AM", text: "New hero copy is live on stg 🎉" },
  { id: "b", who: PM, time: "10:05 AM", text: "Nice, looks good on mobile too." },
];

export function Webhook() {
  const f = useCurrentFrame();
  const launcherAt = onScreen(LAUNCHER_AT);
  const cardEdge = onScreen(CARD_EDGE);
  const cx = keys(f, [
    [0, 700],
    [T.launcher - 4, launcherAt[0]],
    [T.launcher + 12, launcherAt[0]],
    [T.card - 8, cardEdge[0]],
  ]);
  const cy = keys(f, [
    [0, 470],
    [T.launcher - 4, launcherAt[1]],
    [T.launcher + 12, launcherAt[1]],
    [T.card - 8, cardEdge[1]],
  ]);
  const press = f < T.card - 20 ? click(f, T.launcher) : click(f, T.card);
  const posted = f >= T.arrive;
  const messages = posted
    ? [
        ...EARLIER,
        {
          id: "p",
          who: SPOTNOTE,
          time: "10:24 AM",
          text: <b>{NOTE}</b>, // as the Webhook guide's relay posts it: the note, then the prompt
          code: PROMPT,
          lines: 8,
          opacity: progress(f, T.arrive, 8),
          rise: 14 * (1 - progress(f, T.arrive, 10)),
        },
      ]
    : EARLIER;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Camera
        f={f}
        shots={[
          [0, 1, 720, 405],
          [T.launcher + 16, 1, 720, 405],
          [T.card - 4, 1.45, 330, 400],
          [T.enter - 2, 1.45, 330, 400],
          [T.arrive + 6, 1, 720, 405],
          [T.arrive + 40, 1, 720, 405],
          [T.arrive + 64, 1.45, 1190, 420],
          [T.end, 1.45, 1190, 420],
        ]}
      >
        <Desktop wallpaper="light" app="Browser" menus={["File", "Edit", "View", "Window", "Help"]} time="Mon 10:24 AM">
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "0 0",
              transform: `translate(${AT.x}px, ${AT.y}px) scale(${S})`,
            }}
          >
            <Browser front url="stg.acme-shop.com" title="[STG] Acme — New arrivals">
              <Shop staging />
              <Spotnote steps={spotnoteSteps(f, T, VIEWPORT.h)} frame={f} fps={30} />
            </Browser>
          </div>
          <Chat at={CHAT_AT} compact front={false} me={DESIGNER} channel={CHANNEL} messages={messages} />
        </Desktop>
        <Post
          f={f}
          from={onScreen([VIEWPORT.x + VIEWPORT.w, VIEWPORT.y + VIEWPORT.h / 2])}
          to={[CHAT_AT.x + 20, CHAT_AT.y + 200]}
        />
        <Cursor x={cx} y={cy} {...press} />
      </Camera>
      <KeyPresses f={f} presses={[[T.enter - 6, ["↵"]]]} />
      <Caption f={f} captions={CAPTIONS} />
    </AbsoluteFill>
  );
}

// The webhook's request, flying from the site to the chat as the note is sent.
function Post({ f, from, to }) {
  if (f < T.enter || f >= T.arrive + 4) return null;
  const p = progress(f, T.enter, T.arrive - T.enter);
  const x = from[0] + (to[0] - from[0]) * p;
  const y = from[1] + (to[1] - from[1]) * p - Math.sin(p * Math.PI) * 60;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        padding: "5px 10px",
        borderRadius: 999,
        background: "#111",
        color: "#ffd84d",
        font: "600 13px Menlo, monospace",
        whiteSpace: "nowrap",
        opacity: Math.min(1, progress(f, T.enter, 3) * 2, 1 - progress(f, T.arrive, 4)),
        boxShadow: "0 6px 18px rgba(0,0,0,.3)",
        zIndex: 900,
      }}
    >
      POST /spotnote
    </div>
  );
}

const CAPTIONS = [
  [0, T.enter, "On the staging site: click an element, write the change, press Enter"],
  [T.enter, T.end + 8, "The webhook posts it to your team's chat, with its file and line"],
];
