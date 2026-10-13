<script>
  import ProductCard from "./components/ProductCard.svelte";
  import Card from "./components/Card.svelte";

  const features = [
    { title: "Click to source", body: "Point at any element and jump to the exact file and line." },
    { title: "Notes on elements", body: "Leave a note on a component and hand it to your agent." },
    { title: "Framework-agnostic", body: "One client script, any Vite framework." },
  ];

  const products = [
    { id: 1, name: "Aero Runner", price: 120, category: "shoes" },
    { id: 2, name: "Day Tote", price: 80, category: "bags" },
    { id: 3, name: "Chrono 39", price: 240, category: "watches" },
  ];

  let showMore = false;
  let tag = "em";
</script>

<header class="nav">
  <div class="nav-inner">
    <span class="brand">Spotnote · Svelte 4</span>
  </div>
</header>

<main class="page">
  <section class="hero">
    <h1>Build UI feedback into your dev loop</h1>
    <div class="row">
      <span class="btn btn-primary">See products</span>
      <button class="btn" on:click={() => (showMore = !showMore)}>Learn more</button>
    </div>
    {#if showMore}
      <p class="more">Svelte 4 compiles each .svelte file with its own parser.</p>
    {/if}
    <svelte:element this={tag} class="dynamic">a runtime tag</svelte:element>
  </section>

  <section class="section" id="features">
    <h2>Features</h2>
    <div class="grid">
      {#each features as f}
        <Card>
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </Card>
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
