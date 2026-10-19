// A macOS window: rounded, with a shadow, and the three buttons (grey when it
// isn't the front window). `bar` is what sits next to them (a title, or tabs).
export function Window({ x, y, w, h, front, bar, barHeight = 38, dark, style, children }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 12,
        overflow: "hidden",
        background: dark ? "#1c1c1e" : "#fff",
        boxShadow: front
          ? "0 30px 80px rgba(0,0,0,.35), 0 0 0 0.5px rgba(0,0,0,.35)"
          : "0 16px 40px rgba(0,0,0,.22), 0 0 0 0.5px rgba(0,0,0,.25)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div style={{ height: barHeight, flexShrink: 0, display: "flex", alignItems: "center", position: "relative" }}>
        <Lights front={front} />
        {bar}
      </div>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>{children}</div>
    </div>
  );
}

function Lights({ front }) {
  const colors = front ? ["#ff5f57", "#febc2e", "#28c840"] : ["#d0d0d2", "#d0d0d2", "#d0d0d2"];
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 14px", flexShrink: 0 }}>
      {colors.map((c, i) => (
        <span
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            background: c,
            boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,.15)",
          }}
        />
      ))}
    </div>
  );
}
