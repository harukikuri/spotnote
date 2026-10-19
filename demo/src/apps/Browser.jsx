// A browser window: one tab, the address bar, and the page. The page area is
// a containing block for position:fixed, so Spotnote's overlay (fixed to the
// viewport in a real browser) stays inside it.
import { BROWSER } from "../layout.js";
import { Window } from "../mac/Window.jsx";

export function Browser({ front, url, title, children }) {
  return (
    <Window
      {...BROWSER}
      front={front}
      barHeight={40}
      style={{ background: "#dfe1e5" }}
      bar={
        <div
          style={{
            alignSelf: "flex-end",
            marginLeft: 8,
            height: 32,
            width: 240,
            borderRadius: "9px 9px 0 0",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            fontSize: 12,
            color: "#3c4043",
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 4, background: "#111", flexShrink: 0 }} />
          {title}
        </div>
      }
    >
      <div
        style={{
          height: BROWSER.chrome - 40,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 14px",
          color: "#5f6368",
          borderBottom: "1px solid #e3e3e3",
        }}
      >
        <Arrow d="M15 6l-6 6 6 6" />
        <Arrow d="M9 6l6 6-6 6" faint />
        <Arrow d="M19 12a7 7 0 1 1-2-5M19 4v4h-4" />
        <div
          style={{
            flex: 1,
            height: 30,
            borderRadius: 15,
            background: "#f1f3f4",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            fontSize: 13,
            color: "#202124",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" fill="none" stroke="#5f6368" strokeWidth="2" />
          </svg>
          {url}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: `${BROWSER.chrome - 40}px 0 0 0`,
          overflow: "hidden",
          background: "#fff",
          transform: "translateZ(0)",
        }}
      >
        {children}
      </div>
    </Window>
  );
}

const Arrow = ({ d, faint }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ opacity: faint ? 0.35 : 1 }} aria-hidden="true">
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
