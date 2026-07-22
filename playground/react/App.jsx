import { useRoute, Link } from "./router.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import About from "./pages/About.jsx";

export default function App() {
  const route = useRoute();

  let page;
  if (route.path === "/") page = <Home />;
  else if (route.path === "/products") page = <Products query={route.query} />;
  else if (route.path === "/about") page = <About />;
  else
    page = (
      <div className="section">
        <h2>404</h2>
        <p className="muted">No page at {route.path}</p>
        <Link to="/">← Back home</Link>
      </div>
    );

  return (
    <div>
      <header className="nav">
        <div className="nav-inner">
          <span className="brand">◎ Spotnote</span>
          <nav className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/products?category=all&sort=name">Products</Link>
            <Link to="/about">About</Link>
          </nav>
        </div>
      </header>
      <main className="page">{page}</main>
      <footer className="footer">Spotnote playground · React + Vite</footer>
    </div>
  );
}
