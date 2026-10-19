// A team chat app (Slack-like, but nobody's brand): channels on the left, the
// channel's messages, and the message box. A message can carry a code block,
// as a pasted prompt does.
import { CHAT } from "../layout.js";
import { PM } from "../script.js";
import { Window } from "../mac/Window.jsx";

const CHANNELS = ["general", "design-feedback", "frontend", "releases"];

export function Chat({ front, me, channel, messages, draft, selected, style }) {
  return (
    <Window
      {...CHAT}
      front={front}
      style={{ background: "#3f0e40", ...style }}
      bar={<span style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginLeft: 6 }}>Acme</span>}
    >
      <div
        style={{ position: "absolute", inset: 0, display: "flex", fontFamily: "-apple-system, system-ui, sans-serif" }}
      >
        <aside style={{ width: 230, color: "rgba(255,255,255,.75)", fontSize: 14, padding: "10px 0" }}>
          <div style={{ padding: "4px 16px 10px", fontSize: 12, opacity: 0.8 }}>Channels</div>
          {CHANNELS.map((c) => (
            <div
              key={c}
              style={{
                margin: "0 8px",
                padding: "5px 10px",
                borderRadius: 6,
                background: c === channel ? "#1164a3" : "transparent",
                color: c === channel ? "#fff" : undefined,
              }}
            >
              # {c}
            </div>
          ))}
          <div style={{ padding: "18px 16px 10px", fontSize: 12, opacity: 0.8 }}>Direct messages</div>
          {[me, PM].map((p) => (
            <div
              key={p.name}
              style={{ margin: "0 8px", padding: "5px 10px", display: "flex", gap: 8, alignItems: "center" }}
            >
              <Avatar person={p} size={20} />
              {p.name}
            </div>
          ))}
        </aside>
        <main
          style={{
            flex: 1,
            background: "#fff",
            borderTopLeftRadius: 8,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              height: 48,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              padding: "0 20px",
              borderBottom: "1px solid #e8e8e8",
              fontWeight: 700,
              fontSize: 16,
              color: "#1d1c1d",
            }}
          >
            # {channel}
            <span style={{ marginLeft: "auto", fontWeight: 400, fontSize: 13, color: "#616061" }}>6 members</span>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "0 0 8px",
            }}
          >
            {messages.map((m) => (
              <Message key={m.id} {...m} selected={selected === m.id} />
            ))}
          </div>
          <Composer channel={channel} draft={draft} />
        </main>
      </div>
    </Window>
  );
}

function Message({ who, time, text, code, selected, opacity = 1 }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 20px", opacity, color: "#1d1c1d" }}>
      <Avatar person={who} size={36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15 }}>
          <b>{who.name}</b>
          <span style={{ marginLeft: 8, fontSize: 12, color: "#616061" }}>{time}</span>
        </div>
        {text && <div style={{ fontSize: 15, lineHeight: "22px" }}>{text}</div>}
        {code && <Code text={code} selected={selected} />}
      </div>
    </div>
  );
}

function Composer({ channel, draft }) {
  const empty = !draft?.text && !draft?.code;
  return (
    <div style={{ padding: "0 20px 18px", flexShrink: 0 }}>
      <div style={{ border: "1px solid #bbbabb", borderRadius: 8, padding: "10px 12px 8px", color: "#1d1c1d" }}>
        <div style={{ fontSize: 15, minHeight: 22, color: empty ? "#868686" : undefined }}>
          {/* The caret sits before the placeholder, after typed text. */}
          {empty && draft?.caret && caret}
          {empty ? `Message #${channel}` : draft.text}
          {!empty && draft?.caret && caret}
        </div>
        {draft?.code && <Code text={draft.code} />}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, color: "#616061", fontSize: 14 }}>
          <b>B</b>
          <i>I</i>
          <s>S</s>
          <span>🔗</span>
          <span style={{ fontFamily: "Menlo, monospace" }}>{"</>"}</span>
          <span
            style={{
              marginLeft: "auto",
              width: 30,
              height: 26,
              borderRadius: 4,
              display: "grid",
              placeItems: "center",
              background: empty ? "transparent" : "#007a5a",
              color: empty ? "#bbb" : "#fff",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 20l18-8L3 4v6l12 2-12 2z" fill="currentColor" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

const caret = <span style={{ borderLeft: "1.5px solid #1d1c1d", marginRight: -1.5 }} />;

function Code({ text, selected }) {
  return (
    <pre
      style={{
        margin: "6px 0 0",
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid #ddd",
        background: selected ? "#cfe3fb" : "#f8f8f8",
        font: "12px/16px Menlo, monospace",
        color: "#1d1c1d",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </pre>
  );
}

export function Avatar({ person, size }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size / 4.5,
        background: person.color,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontSize: size * (/\p{Extended_Pictographic}/u.test(person.initials) ? 0.6 : 0.38), // an emoji reads only bigger
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {person.initials}
    </span>
  );
}
