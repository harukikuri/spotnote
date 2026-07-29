<script setup>
import { navigate } from "../router.js";

defineProps({ to: { type: String, required: true } });
</script>

<template>
  <a class="link" :href="to" @click.prevent="navigate(to)"><slot /></a>
</template>
