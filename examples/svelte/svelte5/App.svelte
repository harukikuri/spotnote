<script>
import ProductCard from "./components/ProductCard.svelte";
import Bar from "./components/Bar.svelte";
</script>

<header class="nav">
  <div class="nav-inner">
    <span class="brand"><Bar w={96} h={18} dark /></span>
    <nav class="nav-links">
      <a class="link" href="#features"><Bar w={60} /></a>
      <a class="link" href="#products"><Bar w={64} /></a>
    </nav>
  </div>
</header>

<main class="page">
  <section class="hero">
    <h1><Bar w="70%" h={40} dark /></h1>
    <p>
      <Bar h={16} />
      <Bar w="80%" h={16} />
    </p>
    <div class="row">
      <span class="btn btn-primary"><Bar w={100} h={14} dark /></span>
      <span class="btn"><Bar w={80} h={14} /></span>
    </div>
  </section>

  <section class="section" id="features">
    <h2><Bar w={120} h={24} dark /></h2>
    <div class="grid">
      {#each Array(6) as _}
        <div class="card">
          <h3><Bar w="60%" h={16} dark /></h3>
          <p>
            <Bar />
            <Bar w="75%" />
          </p>
        </div>
      {/each}
    </div>
  </section>

  <section class="section" id="products">
    <h2><Bar w={140} h={24} dark /></h2>
    <div class="grid">
      {#each Array(6) as _}
        <ProductCard />
      {/each}
    </div>
  </section>
</main>

<footer class="footer"><Bar w={180} /></footer>
