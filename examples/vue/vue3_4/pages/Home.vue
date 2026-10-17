<script setup>
import AppLink from "../components/AppLink.vue";
import Bar from "../components/Bar.vue";
</script>

<template>
  <div>
    <section class="hero">
      <h1><Bar w="70%" :h="40" dark /></h1>
      <p>
        <Bar :h="16" />
        <Bar w="80%" :h="16" />
      </p>
      <div class="row">
        <AppLink to="/products?category=all&sort=name">
          <span class="btn btn-primary"><Bar :w="100" :h="14" dark /></span>
        </AppLink>
        <AppLink to="/about">
          <span class="btn"><Bar :w="80" :h="14" /></span>
        </AppLink>
      </div>
    </section>

    <section class="section">
      <h2><Bar :w="120" :h="24" dark /></h2>
      <div class="grid">
        <div class="card" v-for="i in 6" :key="i">
          <h3><Bar w="60%" :h="16" dark /></h3>
          <p>
            <Bar />
            <Bar w="75%" />
          </p>
        </div>
      </div>
    </section>

    <section class="section">
      <h2><Bar :w="160" :h="24" dark /></h2>
      <ul class="list">
        <li v-for="i in 12" :key="i">
          <span><Bar :w="180" /></span>
          <span class="muted"><Bar :w="60" /></span>
        </li>
      </ul>
    </section>
  </div>
</template>
