<!-- A text-free placeholder bar (Suspense-skeleton look) so demo recordings
     show layout only, no readable copy. -->
<script>
  let { w = "100%", h = 12, dark = false } = $props();
  const px = (v) => (typeof v === "number" ? v + "px" : v);
</script>

<span class="bar" class:bar-dark={dark} style:width={px(w)} style:height={px(h)}></span>
