<!-- Reused across the products grid — its host elements stamp to
     ProductCard.svelte, and its many instances exercise the occurrence-index id. -->
<script>
  import Bar from "./Bar.svelte";
</script>

<div class="product">
  <div class="muted"><Bar w={50} h={10} /></div>
  <h3><Bar w="70%" h={16} dark /></h3>
  <div class="price"><Bar w={40} h={14} dark /></div>
</div>
