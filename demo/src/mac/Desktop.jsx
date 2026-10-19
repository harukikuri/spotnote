// The Mac: a wallpaper, the menu bar (with the front app's name), and the
// windows on top.
import { MENU_BAR, SCREEN } from "../layout.js";

const WALLPAPERS = {
  designer:
    "radial-gradient(120% 90% at 15% 10%, #f7c9a8 0%, transparent 55%), radial-gradient(110% 90% at 90% 90%, #9db7f5 0%, transparent 60%), linear-gradient(160deg, #e9b6c9, #a7b9ef)",
  developer:
    "radial-gradient(120% 90% at 20% 0%, #33415c 0%, transparent 60%), radial-gradient(100% 80% at 90% 100%, #1d6f6a 0%, transparent 60%), linear-gradient(160deg, #1b2033, #0f3b3f)",
};

export function Desktop({ wallpaper, app, menus, time, children }) {
  const dark = wallpaper === "developer";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: SCREEN.w,
        height: SCREEN.h,
        overflow: "hidden",
        background: WALLPAPERS[wallpaper],
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: MENU_BAR,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 18px",
          fontSize: 13,
          color: dark ? "#fff" : "#1d1d1f",
          background: dark ? "rgba(20,20,30,.35)" : "rgba(255,255,255,.35)",
          backdropFilter: "blur(20px)",
          zIndex: 10,
        }}
      >
        <MenuMark />
        <b>{app}</b>
        {menus.map((m) => (
          <span key={m}>{m}</span>
        ))}
        <span style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          <Battery />
          <span>{time}</span>
        </span>
      </div>
      {children}
    </div>
  );
}

// A plain mark where the system menu sits (not anyone's logo).
const MenuMark = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="7" cy="7" r="2" fill="currentColor" />
  </svg>
);
const Battery = () => (
  <svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
    <rect x="0.5" y="0.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" opacity=".5" />
    <rect x="2" y="2" width="14" height="8" rx="1.5" fill="currentColor" />
    <rect x="21.5" y="4" width="1.5" height="4" rx=".75" fill="currentColor" opacity=".5" />
  </svg>
);
