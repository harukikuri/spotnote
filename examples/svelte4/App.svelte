<script>
import ProductCard from "./components/ProductCard.svelte";
import Card from "./components/Card.svelte";
import Bar from "./components/Bar.svelte";

let showMore = false;
let tag = "em";
</script>

<header class="nav">
  <div class="nav-inner">
    <span class="brand"><Bar w={96} h={18} dark /></span>
  </div>
</header>

<main class="page">
  <section class="hero">
    <h1><Bar w="70%" h={40} dark /></h1>
    <div class="row">
      <span class="btn btn-primary"><Bar w={100} h={14} dark /></span>
      <button class="btn" on:click={() => (showMore = !showMore)}><Bar w={80} h={14} /></button>
    </div>
    {#if showMore}
      <p class="more"><Bar w="60%" h={16} /></p>
    {/if}
    <svelte:element this={tag} class="dynamic"><Bar w={120} /></svelte:element>
  </section>

  <section class="section" id="features">
    <h2><Bar w={120} h={24} dark /></h2>
    <div class="grid">
      {#each Array(3) as _}
        <Card>
          <h3><Bar w="60%" h={16} dark /></h3>
          <p>
            <Bar />
            <Bar w="75%" />
          </p>
        </Card>
      {/each}
    </div>
  </section>

  <section class="section" id="products">
    <h2><Bar w={140} h={24} dark /></h2>
    <div class="grid">
      {#each Array(3) as _}
        <ProductCard />
      {/each}
    </div>
  </section>
</main>
