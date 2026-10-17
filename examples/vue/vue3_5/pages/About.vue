<script setup>
import Bar from "../components/Bar.vue";
</script>

<template>
  <div>
    <section class="hero">
      <h1><Bar :w="160" :h="40" dark /></h1>
      <p><Bar w="90%" :h="16" /></p>
    </section>
    <section class="section" v-for="i in 6" :key="i">
      <h2><Bar :w="200" :h="24" dark /></h2>
      <p>
        <Bar />
        <Bar w="95%" />
        <Bar w="60%" />
      </p>
    </section>
  </div>
</template>
