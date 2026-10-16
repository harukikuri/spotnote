import App from "./App.svelte";
import "./styles.css";

// The Spotnote Vite plugin injects the picker automatically in dev.
new App({ target: document.getElementById("app") });
