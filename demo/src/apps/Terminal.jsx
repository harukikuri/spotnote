// A terminal running a coding agent's chat (drawn after Claude Code): the
// welcome box, the conversation so far, a spinner while it works, and the
// input box.
import { TERMINAL } from "../layout.js";
import { Window } from "../mac/Window.jsx";

export const ORANGE = "#d97757";
const MONO = "13.5px/20px Menlo, 'SF Mono', monospace";

export function Terminal({ front, cwd, children, input, caret, spinner, style }) {
  return (
    <Window
      {...TERMINAL}
      front={front}
      dark
      barHeight={30}
      style={{ background: "#1e1e1e", ...style }}
      bar={
        <span
          style={{ position: "absolute", left: 0, right: 0, textAlign: "center", color: "#9a9a9a", fontSize: 12.5 }}
        >
          dev — claude — 120×36
        </span>
      }
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "14px 18px",
          font: MONO,
          color: "#e6e6e6",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
        }}
      >
        <div
          style={{ border: `1px solid ${ORANGE}`, borderRadius: 6, padding: "8px 14px", marginBottom: 14, width: 560 }}
        >
          <div>
            <span style={{ color: ORANGE }}>✻</span> Welcome to <b>Claude Code</b>!
          </div>
          <div style={{ color: "#8a8a8a", marginTop: 8 }}>{"  /help for help, /status for your current setup"}</div>
          <div style={{ color: "#8a8a8a", marginTop: 8 }}>{`  cwd: ${cwd}`}</div>
        </div>
        {children}
        {spinner && (
          <div style={{ color: ORANGE, marginTop: 12 }}>
            {spinner} <span style={{ color: "#8a8a8a" }}>(esc to interrupt)</span>
          </div>
        )}
        <div style={{ border: "1px solid #5a5a5a", borderRadius: 6, padding: "6px 12px", marginTop: 12 }}>
          <span style={{ color: "#8a8a8a" }}>{">"} </span>
          {input}
          {caret && <span style={{ background: "#e6e6e6", color: "#1e1e1e" }}> </span>}
        </div>
        <div style={{ color: "#6a6a6a", padding: "4px 12px 0" }}>? for shortcuts</div>
      </div>
    </Window>
  );
}

// One step of the agent: a bullet, what it did, and what came of it.
export function Step({ title, detail, children, done = true }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div>
        <span style={{ color: done ? "#5fb871" : "#8a8a8a" }}>⏺</span> {title}
      </div>
      {detail && <div style={{ color: "#8a8a8a" }}>{`  ⎿  ${detail}`}</div>}
      {children}
    </div>
  );
}

export function UserPrompt({ text }) {
  return (
    <div style={{ marginTop: 4, color: "#a8a8a8" }}>
      {">"} {text}
    </div>
  );
}

// Changed lines: [number, " " | "-" | "+", code].
export function Diff({ lines }) {
  return (
    <div style={{ margin: "4px 0 0 30px" }}>
      {lines.map(([n, sign, code]) => (
        <div
          key={`${n}${sign}`}
          style={{
            background: sign === "-" ? "#4b1e22" : sign === "+" ? "#1d3d24" : "transparent",
            color: sign === " " ? "#9a9a9a" : "#e6e6e6",
          }}
        >
          {`${String(n).padStart(4)} ${sign === " " ? " " : sign}  ${code}`}
        </div>
      ))}
    </div>
  );
}
