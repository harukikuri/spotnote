// Minimal dependency-free router: History API + a custom navigate event,
// exposed as a shared reactive `route` ref (mirrors the React playground).
import { ref } from "vue";

function current() {
  return { path: window.location.pathname, query: new URLSearchParams(window.location.search) };
}

export const route = ref(current());

function update() {
  route.value = current();
}
window.addEventListener("popstate", update);
window.addEventListener("app:navigate", update);

export function navigate(to) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new Event("app:navigate"));
  window.scrollTo(0, 0);
}
