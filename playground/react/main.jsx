import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// The Spotnote Vite plugin injects the picker automatically in dev.
createRoot(document.getElementById("root")).render(<App />);
