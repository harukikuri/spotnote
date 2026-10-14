import { Link } from "../router.jsx";
import Bar from "../components/Bar.jsx";

export default function Home() {
  return (
    <div>
      <section className="hero">
        <h1><Bar w="70%" h={40} dark /></h1>
        <p>
          <Bar w="100%" h={16} />
          <Bar w="80%" h={16} />
        </p>
        <div className="row">
          <Link to="/products?category=all&sort=name">
            <span className="btn btn-primary"><Bar w={100} h={14} dark /></span>
          </Link>
          <Link to="/about">
            <span className="btn"><Bar w={80} h={14} /></span>
          </Link>
        </div>
      </section>

      <section className="section">
        <h2><Bar w={120} h={24} dark /></h2>
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="card" key={i}>
              <h3><Bar w="60%" h={16} dark /></h3>
              <p>
                <Bar w="100%" />
                <Bar w="75%" />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2><Bar w={160} h={24} dark /></h2>
        <ul className="list">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i}>
              <span><Bar w={180} /></span>
              <span className="muted"><Bar w={60} /></span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
