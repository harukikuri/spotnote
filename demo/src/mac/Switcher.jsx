// The ⌘ Tab app switcher: the open apps, the chosen one framed.
import { AppIcon } from "./AppIcon.jsx";

export function Switcher({ apps, chosen, opacity }) {
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) scale(${0.96 + opacity * 0.04})`,
        opacity,
        display: "flex",
        gap: 14,
        padding: 16,
        borderRadius: 22,
        background: "rgba(40,40,44,.55)",
        backdropFilter: "blur(30px)",
        boxShadow: "0 20px 60px rgba(0,0,0,.35)",
        zIndex: 1500,
        fontFamily: "-apple-system, system-ui, sans-serif",
      }}
    >
      {apps.map((a) => (
        <div
          key={a}
          style={{
            padding: 10,
            borderRadius: 14,
            background: a === chosen ? "rgba(255,255,255,.22)" : "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AppIcon app={a} size={84} />
          <span style={{ color: "#fff", fontSize: 13, opacity: a === chosen ? 1 : 0 }}>{a}</span>
        </div>
      ))}
    </div>
  );
}
