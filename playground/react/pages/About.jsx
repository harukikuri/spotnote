import Bar from "../components/Bar.jsx";

export default function About() {
  return (
    <div>
      <section className="hero">
        <h1><Bar w={160} h={40} dark /></h1>
        <p><Bar w="90%" h={16} /></p>
      </section>
      {Array.from({ length: 6 }, (_, i) => (
        <section className="section" key={i}>
          <h2><Bar w={200} h={24} dark /></h2>
          <p>
            <Bar w="100%" />
            <Bar w="95%" />
            <Bar w="60%" />
          </p>
        </section>
      ))}
    </div>
  );
}
