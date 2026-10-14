<!-- A text-free placeholder bar (Suspense-skeleton look) so demo recordings
     show layout only, no readable copy. -->
<script>
  export let w = "100%";
  export let h = 12;
  export let dark = false;
  const px = (v) => (typeof v === "number" ? v + "px" : v);
</script>

<span class="bar" class:bar-dark={dark} style:width={px(w)} style:height={px(h)}></span>
