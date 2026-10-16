// Minimal dependency-free router: History API + a custom navigate event.
import { useState, useEffect } from "react";

function current() {
  return { path: window.location.pathname, query: new URLSearchParams(window.location.search) };
}

export function navigate(to) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new Event("app:navigate"));
  window.scrollTo(0, 0);
}

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => setRoute(current());
    window.addEventListener("popstate", on);
    window.addEventListener("app:navigate", on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("app:navigate", on);
    };
  }, []);
  return route;
}

export function Link({ to, children }) {
  return (
    <a
      href={to}
      className="link"
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
