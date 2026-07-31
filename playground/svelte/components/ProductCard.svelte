<!-- Reused across the products grid — its host elements stamp to
     ProductCard.svelte, and its many instances exercise the occurrence-index id. -->
<script>
  let { product } = $props();
</script>

<div class="product">
  <div class="muted">{product.category}</div>
  <h3>{product.name}</h3>
  <div class="price">${product.price}</div>
</div>
