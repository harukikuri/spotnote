// A text-free placeholder bar (Suspense-skeleton look) so demo recordings
// show layout only, no readable copy. Solid has no stylesheet, so it's inline.
function Bar(props) {
  const px = (v) => (typeof v === "number" ? v + "px" : v);
  return (
    <span
      style={{
        display: "block",
        "max-width": "100%",
        "border-radius": "6px",
        background: props.dark ? "#d6d6db" : "#ececef",
        width: px(props.w ?? "100%"),
        height: px(props.h ?? 12),
      }}
    />
  );
}

export default function App() {
  return (
    <main style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:32px">
      <h1><Bar w="60%" h={32} dark /></h1>
      <p><Bar w="80%" h={14} /></p>
      <div style="display:flex;gap:8px;margin:16px 0">
        <button><Bar w={60} h={10} dark /></button>
        <button><Bar w={70} h={10} /></button>
      </div>
      <ul>
        {[0, 1, 2].map(() => (
          <li style="margin:8px 0"><Bar w={80} /></li>
        ))}
      </ul>
    </main>
  );
}
