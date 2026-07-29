<!-- Reused across the products grid — its host elements stamp to ProductCard.vue,
     and its many instances exercise the occurrence-index id. -->
<script setup>
defineProps({ product: { type: Object, required: true } });
</script>

<template>
  <div class="product">
    <div class="muted">{{ product.category }}</div>
    <h3>{{ product.name }}</h3>
    <div class="price">${{ product.price }}</div>
  </div>
</template>
