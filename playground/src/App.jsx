import { Header } from "./components/Header.jsx";
import { ProductCard } from "./components/ProductCard.jsx";

const PRODUCTS = [
  { name: "Aero Runner", price: "$120", tint: ["#ffd9c2", "#ff8a5c"] },
  { name: "Trail Pack 22L", price: "$89", tint: ["#d6f0e0", "#3fa66b"] },
  { name: "Daily Tee", price: "$32", tint: ["#dfe6ff", "#5b7cfa"] },
  { name: "Canvas Cap", price: "$28", tint: ["#fff1c2", "#e0a800"] },
  { name: "Merino Socks", price: "$18", tint: ["#f3dcff", "#a35be0"] },
  { name: "Rain Shell", price: "$148", tint: ["#d4f1f4", "#1d9aa8"] },
];

export function App() {
  return (
    <>
      <Header />
      <main className="page">
        <section className="hero">
          <h1>New arrivals</h1>
          <p>Fresh gear for the season.</p>
          <button type="button" className="button">
            Shop the collection
          </button>
        </section>
        <section className="grid">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.name} product={p} />
          ))}
        </section>
      </main>
    </>
  );
}
