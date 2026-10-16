<!-- A text-free placeholder bar (Suspense-skeleton look) so demo recordings
     show layout only, no readable copy. -->
<script setup>
const props = defineProps({
  w: { type: [Number, String], default: "100%" },
  h: { type: Number, default: 12 },
  dark: Boolean,
});
const px = (v) => (typeof v === "number" ? v + "px" : v);
</script>

<template>
  <span :class="['bar', { 'bar-dark': props.dark }]" :style="{ width: px(props.w), height: px(props.h) }" />
</template>
