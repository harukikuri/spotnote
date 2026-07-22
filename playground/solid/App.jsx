const items = ["Alpha", "Beta", "Gamma"];

export default function App() {
  return (
    <main style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;padding:32px">
      <h1>Spotnote — Solid playground</h1>
      <p>
        Hold <kbd>Alt</kbd> and click an element (or toggle Inspect in the launcher).
      </p>
      <div style="display:flex;gap:8px;margin:16px 0">
        <button>Primary</button>
        <button>Secondary</button>
      </div>
      <ul>
        {items.map((it) => (
          <li>{it}</li>
        ))}
      </ul>
    </main>
  );
}
