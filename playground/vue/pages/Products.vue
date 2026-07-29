<script setup>
import { computed } from "vue";
import { route, navigate } from "../router.js";
import ProductCard from "../components/ProductCard.vue";

const PRODUCTS = [
  { id: 1, name: "Aero Runner", price: 120, category: "shoes" },
  { id: 2, name: "Trail Blazer", price: 145, category: "shoes" },
  { id: 3, name: "City Loafer", price: 99, category: "shoes" },
  { id: 4, name: "Court Classic", price: 110, category: "shoes" },
  { id: 5, name: "Day Tote", price: 80, category: "bags" },
  { id: 6, name: "Weekender", price: 160, category: "bags" },
  { id: 7, name: "Sling Pack", price: 65, category: "bags" },
  { id: 8, name: "Field Backpack", price: 130, category: "bags" },
  { id: 9, name: "Chrono 39", price: 240, category: "watches" },
  { id: 10, name: "Diver Pro", price: 320, category: "watches" },
  { id: 11, name: "Minimal 36", price: 180, category: "watches" },
  { id: 12, name: "Field Watch", price: 150, category: "watches" },
];

const CATEGORIES = ["all", "shoes", "bags", "watches"];

const category = computed(() => route.value.query.get("category") || "all");
const sort = computed(() => route.value.query.get("sort") || "name");

const items = computed(() => {
  const list = PRODUCTS.filter((p) => category.value === "all" || p.category === category.value);
  return [...list].sort((a, b) =>
    sort.value === "price" ? a.price - b.price : a.name.localeCompare(b.name),
  );
});

function setParam(k, v) {
  const q = new URLSearchParams(route.value.query.toString());
  q.set(k, v);
  navigate("/products?" + q.toString());
}
</script>

<template>
  <div>
    <section class="section">
      <h2>Products</h2>
      <p class="muted">
        category=<b>{{ category }}</b> · sort=<b>{{ sort }}</b> · {{ items.length }} items
      </p>
    </section>

    <div class="filters">
      <button
        v-for="c in CATEGORIES"
        :key="c"
        :class="['chip', { 'chip-active': c === category }]"
        @click="setParam('category', c)"
      >
        {{ c }}
      </button>
      <span class="muted" style="margin-left: auto">sort:</span>
      <button
        v-for="s in ['name', 'price']"
        :key="s"
        :class="['chip', { 'chip-active': s === sort }]"
        @click="setParam('sort', s)"
      >
        {{ s }}
      </button>
    </div>

    <div class="grid">
      <ProductCard v-for="p in items" :key="p.id" :product="p" />
    </div>
  </div>
</template>
