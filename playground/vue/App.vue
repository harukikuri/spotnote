<script setup>
import { computed } from "vue";
import { route } from "./router.js";
import AppLink from "./components/AppLink.vue";
import Home from "./pages/Home.vue";
import Products from "./pages/Products.vue";
import About from "./pages/About.vue";

// Pages read the shared `route` themselves, so no props to thread through.
const page = computed(() => {
  const p = route.value.path;
  if (p === "/") return Home;
  if (p === "/products") return Products;
  if (p === "/about") return About;
  return null;
});
</script>

<template>
  <div>
    <header class="nav">
      <div class="nav-inner">
        <span class="brand">◎ Spotnote</span>
        <nav class="nav-links">
          <AppLink to="/">Home</AppLink>
          <AppLink to="/products?category=all&sort=name">Products</AppLink>
          <AppLink to="/about">About</AppLink>
        </nav>
      </div>
    </header>

    <main class="page">
      <component :is="page" v-if="page" />
      <div v-else class="section">
        <h2>404</h2>
        <p class="muted">No page at {{ route.path }}</p>
        <AppLink to="/">← Back home</AppLink>
      </div>
    </main>

    <footer class="footer">Spotnote playground · Vue + Vite</footer>
  </div>
</template>
