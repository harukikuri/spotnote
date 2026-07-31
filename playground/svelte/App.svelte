<script>
  import ProductCard from "./components/ProductCard.svelte";

  const features = [
    { title: "Click to source", body: "Point at any element and jump to the exact file and line." },
    { title: "Notes on elements", body: "Leave a note on a component and hand it to your agent." },
    { title: "Framework-agnostic", body: "One client script, any Vite framework." },
    { title: "Pins persist", body: "Reopen and edit a note anytime from the launcher." },
    { title: "No server", body: "Everything runs locally in dev — nothing to host." },
    { title: "Agent-ready", body: "Reads classes and computed styles into the prompt." },
  ];

  const products = [
    { id: 1, name: "Aero Runner", price: 120, category: "shoes" },
    { id: 2, name: "Trail Blazer", price: 145, category: "shoes" },
    { id: 3, name: "Day Tote", price: 80, category: "bags" },
    { id: 4, name: "Weekender", price: 160, category: "bags" },
    { id: 5, name: "Chrono 39", price: 240, category: "watches" },
    { id: 6, name: "Field Watch", price: 150, category: "watches" },
  ];
</script>

<header class="nav">
  <div class="nav-inner">
    <span class="brand">◎ Spotnote</span>
    <nav class="nav-links">
      <a class="link" href="#features">Features</a>
      <a class="link" href="#products">Products</a>
    </nav>
  </div>
</header>

<main class="page">
  <section class="hero">
    <h1>Build UI feedback into your dev loop</h1>
    <p>
      A dev-only tool to point at elements, capture their exact source location, and turn a
      quick note into an agent-ready prompt.
    </p>
    <div class="row">
      <span class="btn btn-primary">Browse products</span>
      <span class="btn">Learn more</span>
    </div>
  </section>

  <section class="section" id="features">
    <h2>Features</h2>
    <div class="grid">
      {#each features as f}
        <div class="card">
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="section" id="products">
    <h2>Products</h2>
    <div class="grid">
      {#each products as p (p.id)}
        <ProductCard product={p} />
      {/each}
    </div>
  </section>
</main>

<footer class="footer">Spotnote playground · Svelte + Vite</footer>
