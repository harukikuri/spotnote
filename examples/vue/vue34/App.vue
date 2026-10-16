<script setup>
import { computed } from "vue";
import { route } from "./router.js";
import AppLink from "./components/AppLink.vue";
import Bar from "./components/Bar.vue";
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
        <span class="brand"><Bar :w="96" :h="18" dark /></span>
        <nav class="nav-links">
          <AppLink to="/"><Bar :w="44" /></AppLink>
          <AppLink to="/products?category=all&sort=name"><Bar :w="64" /></AppLink>
          <AppLink to="/about"><Bar :w="52" /></AppLink>
        </nav>
      </div>
    </header>

    <main class="page">
      <component :is="page" v-if="page" />
      <div v-else class="section">
        <h2><Bar :w="120" :h="24" dark /></h2>
        <AppLink to="/"><Bar :w="100" /></AppLink>
      </div>
    </main>

    <footer class="footer"><Bar :w="180" /></footer>
  </div>
</template>
