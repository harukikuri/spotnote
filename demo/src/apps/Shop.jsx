// The app under review: a small shop, laid out from GRID so Spotnote's overlay
// can find its cards (they stay put either way). `staging`: the staging build,
// which says so in a striped banner, with the commit it's built from, above the
// header. `padding`: the cards' (it changes).
import { card, GRID, VIEWPORT } from "../layout.js";
import { COMMIT } from "../script.js";

const PRODUCTS = [
  { name: "Aero Runner", price: "$120", tint: ["#ffd9c2", "#ff8a5c"] },
  { name: "Trail Pack 22L", price: "$89", tint: ["#d6f0e0", "#3fa66b"] },
  { name: "Daily Tee", price: "$32", tint: ["#dfe6ff", "#5b7cfa"] },
  { name: "Canvas Cap", price: "$28", tint: ["#fff1c2", "#e0a800"] },
  { name: "Merino Socks", price: "$18", tint: ["#f3dcff", "#a35be0"] },
  { name: "Rain Shell", price: "$148", tint: ["#d4f1f4", "#1d9aa8"] },
];

export function Shop({ staging, padding = 16 }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: VIEWPORT.w,
        background: "#fafafa",
        fontFamily: "-apple-system, system-ui, sans-serif",
        color: "#111",
      }}
    >
      {staging && (
        <div
          style={{
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontSize: 12.5,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: "#fff",
            background: "repeating-linear-gradient(135deg, #e8590c 0 14px, #d9480f 14px 28px)",
          }}
        >
          STAGING
          <span style={{ fontWeight: 500, opacity: 0.9, letterSpacing: 0 }}>
            Not the live site · build {COMMIT} from main
          </span>
        </div>
      )}
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: `0 ${GRID.x}px`,
          borderBottom: "1px solid #eee",
          background: "#fff",
        }}
      >
        <b style={{ fontSize: 20, letterSpacing: -0.5 }}>acme</b>
        <nav style={{ marginLeft: "auto", display: "flex", gap: 28, fontSize: 14, color: "#555" }}>
          <span>New</span>
          <span>Men</span>
          <span>Women</span>
          <span>Sale</span>
          <span>Cart (0)</span>
        </nav>
      </header>
      <div style={{ position: "absolute", left: GRID.x, top: 120 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>New arrivals</div>
        <div style={{ fontSize: 14, color: "#777", marginTop: 4 }}>Fresh gear for the season.</div>
      </div>
      {PRODUCTS.map((p, i) => (
        <Card key={p.name} {...card(i)} product={p} padding={padding} />
      ))}
    </div>
  );
}

function Card({ x, y, w, h, product, padding }) {
  return (
    <div
      className="card"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        padding,
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,.06), 0 0 0 1px #eee",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 10,
          background: `radial-gradient(60% 60% at 50% 55%, ${product.tint[1]}, ${product.tint[0]})`,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
        <span style={{ fontWeight: 600 }}>{product.name}</span>
        <span style={{ color: "#555" }}>{product.price}</span>
      </div>
    </div>
  );
}
