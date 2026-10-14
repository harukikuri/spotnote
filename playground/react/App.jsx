import { useRoute, Link } from "./router.jsx";
import Home from "./pages/Home.jsx";
import Products from "./pages/Products.jsx";
import About from "./pages/About.jsx";
import Bar from "./components/Bar.jsx";

export default function App() {
  const route = useRoute();

  let page;
  if (route.path === "/") page = <Home />;
  else if (route.path === "/products") page = <Products query={route.query} />;
  else if (route.path === "/about") page = <About />;
  else
    page = (
      <div className="section">
        <h2><Bar w={120} h={24} dark /></h2>
        <Link to="/"><Bar w={100} /></Link>
      </div>
    );

  return (
    <div>
      <header className="nav">
        <div className="nav-inner">
          <span className="brand"><Bar w={96} h={18} dark /></span>
          <nav className="nav-links">
            <Link to="/"><Bar w={44} /></Link>
            <Link to="/products?category=all&sort=name"><Bar w={64} /></Link>
            <Link to="/about"><Bar w={52} /></Link>
          </nav>
        </div>
      </header>
      <main className="page">{page}</main>
      <footer className="footer"><Bar w={180} /></footer>
    </div>
  );
}
