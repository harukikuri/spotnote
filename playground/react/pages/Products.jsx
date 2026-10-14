import { navigate } from "../router.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Bar from "../components/Bar.jsx";

const PRODUCTS = [
  { id: 1, name: "Aero Runner", price: 120, category: "shoes" },
  { id: 2, name: "Trail Blazer", price: 145, category: "shoes" },
  { id: 3, name: "City Loafer", price: 99, category: "shoes" },
  { id: 4, name: "Court Classic", price: 110, category: "shoes" },
  { id: 5, name: "Day Tote", price: 80, category: "bags" },
  { id: 6, name: "Weekender", price: 160, category: "bags" },
  { id: 7, name: "Sling Pack", price: 65, category: "bags" },
  { id: 8, name: "Field Backpack", price: 130, category: "bags" },
  { id: 9, name: "Chrono 39", price: 240, category: "watches" },
  { id: 10, name: "Diver Pro", price: 320, category: "watches" },
  { id: 11, name: "Minimal 36", price: 180, category: "watches" },
  { id: 12, name: "Field Watch", price: 150, category: "watches" },
];

const CATEGORIES = ["all", "shoes", "bags", "watches"];

export default function Products({ query }) {
  const category = query.get("category") || "all";
  const sort = query.get("sort") || "name";

  let items = PRODUCTS.filter((p) => category === "all" || p.category === category);
  items = [...items].sort((a, b) =>
    sort === "price" ? a.price - b.price : a.name.localeCompare(b.name),
  );

  const setParam = (k, v) => {
    const q = new URLSearchParams(query.toString());
    q.set(k, v);
    navigate("/products?" + q.toString());
  };

  return (
    <div>
      <section className="section">
        <h2><Bar w={140} h={24} dark /></h2>
        <p className="muted"><Bar w={220} /></p>
      </section>

      <div className="filters">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={"chip" + (c === category ? " chip-active" : "")}
            onClick={() => setParam("category", c)}
          >
            <Bar w={40} h={10} dark={c === category} />
          </button>
        ))}
        <span className="muted" style={{ marginLeft: "auto" }}>
          <Bar w={30} h={10} />
        </span>
        {["name", "price"].map((s) => (
          <button
            key={s}
            className={"chip" + (s === sort ? " chip-active" : "")}
            onClick={() => setParam("sort", s)}
          >
            <Bar w={36} h={10} dark={s === sort} />
          </button>
        ))}
      </div>

      <div className="grid">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
