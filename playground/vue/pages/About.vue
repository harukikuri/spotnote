<script setup>
const SECTIONS = [
  ["What is this?", "A playground for Spotnote — a realistic multi-page Vue app you can point the picker at."],
  ["Routing", "Navigation uses the History API with query strings, so you can test the picker across route changes."],
  ["Scrolling", "Every page is intentionally tall so pins and the note panel can be tested through scroll."],
  ["Repeated elements", "The products grid renders many identical cards to exercise per-instance identity."],
  ["Components", "Cards live in their own file, so their stamps point back to where they were authored."],
  ["Notes", "Select an element, write a note, and copy an agent-ready prompt to the clipboard."],
];
</script>

<template>
  <div>
    <section class="hero">
      <h1>About</h1>
      <p>Everything on this page is a target for the picker. Scroll around and drop a few notes.</p>
    </section>
    <section class="section" v-for="[title, body] in SECTIONS" :key="title">
      <h2>{{ title }}</h2>
      <p>{{ body }}</p>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
        ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
        ullamco laboris nisi ut aliquip ex ea commodo consequat.
      </p>
    </section>
  </div>
</template>
