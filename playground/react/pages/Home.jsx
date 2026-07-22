import { Link } from "../router.jsx";

const features = [
  { title: "Click to source", body: "Point at any element and jump to the exact file and line." },
  { title: "Notes on elements", body: "Leave a note on a component and hand it to your agent." },
  { title: "Framework-agnostic", body: "One client script, any Vite framework." },
  { title: "No server", body: "Everything runs locally in dev — nothing to host." },
  { title: "Pins persist", body: "Reopen and edit a note anytime from the launcher." },
  { title: "Tailwind-friendly", body: "Reads classes and computed styles into the prompt." },
];

export default function Home() {
  return (
    <div>
      <section className="hero">
        <h1>Build UI feedback into your dev loop</h1>
        <p>
          A dev-only tool to point at elements, capture their exact source location, and turn a
          quick note into an agent-ready prompt.
        </p>
        <div className="row">
          <Link to="/products?category=all&sort=name">
            <span className="btn btn-primary">Browse products</span>
          </Link>
          <Link to="/about">
            <span className="btn">Learn more</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>Features</h2>
        <div className="grid">
          {features.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Recent activity</h2>
        <ul className="list">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <span>Deploy #{120 - i} finished</span>
              <span className="muted">{i + 1} min ago</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
