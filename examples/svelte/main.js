import { mount } from "svelte";
import App from "./App.svelte";
import "./styles.css";

// The Spotnote Vite plugin injects the picker automatically in dev.
mount(App, { target: document.getElementById("app") });
