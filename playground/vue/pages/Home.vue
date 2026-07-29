<script setup>
import AppLink from "../components/AppLink.vue";

const features = [
  { title: "Click to source", body: "Point at any element and jump to the exact file and line." },
  { title: "Notes on elements", body: "Leave a note on a component and hand it to your agent." },
  { title: "Framework-agnostic", body: "One client script, any Vite framework." },
  { title: "No server", body: "Everything runs locally in dev — nothing to host." },
  { title: "Pins persist", body: "Reopen and edit a note anytime from the launcher." },
  { title: "Tailwind-friendly", body: "Reads classes and computed styles into the prompt." },
];

const activity = Array.from({ length: 12 }, (_, i) => ({ n: 120 - i, ago: i + 1 }));
</script>

<template>
  <div>
    <section class="hero">
      <h1>Build UI feedback into your dev loop</h1>
      <p>
        A dev-only tool to point at elements, capture their exact source location, and turn a
        quick note into an agent-ready prompt.
      </p>
      <div class="row">
        <AppLink to="/products?category=all&sort=name">
          <span class="btn btn-primary">Browse products</span>
        </AppLink>
        <AppLink to="/about">
          <span class="btn">Learn more</span>
        </AppLink>
      </div>
    </section>

    <section class="section">
      <h2>Features</h2>
      <div class="grid">
        <div class="card" v-for="f in features" :key="f.title">
          <h3>{{ f.title }}</h3>
          <p>{{ f.body }}</p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Recent activity</h2>
      <ul class="list">
        <li v-for="a in activity" :key="a.n">
          <span>Deploy #{{ a.n }} finished</span>
          <span class="muted">{{ a.ago }} min ago</span>
        </li>
      </ul>
    </section>
  </div>
</template>
