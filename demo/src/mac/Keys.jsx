// The keys being pressed, shown as keycaps at the bottom of the screen.
export function Keys({ keys, opacity }) {
  if (!keys || opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 130,
        transform: `translateX(-50%) translateY(${(1 - opacity) * 8}px)`,
        opacity,
        display: "flex",
        gap: 8,
        zIndex: 2000,
      }}
    >
      {keys.map((k) => (
        <span
          key={k}
          style={{
            minWidth: 64,
            height: 64,
            padding: "0 20px",
            display: "grid",
            placeItems: "center",
            borderRadius: 14,
            background: "rgba(28,28,30,.86)",
            color: "#fff",
            font: "500 28px -apple-system, system-ui, sans-serif",
            boxShadow: "0 8px 24px rgba(0,0,0,.3), inset 0 -2px 0 rgba(255,255,255,.08)",
          }}
        >
          {k}
        </span>
      ))}
    </div>
  );
}
