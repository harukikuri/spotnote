import App from "./App.svelte";
import "../svelte/styles.css"; // same look as the Svelte 5 example

// The Spotnote Vite plugin injects the picker automatically in dev.
new App({ target: document.getElementById("app") });
