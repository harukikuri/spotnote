import ReactDOM from "react-dom";
import App from "./App.jsx";
import "./styles.css";

// React 17 has no createRoot: render the old way.
// The Spotnote Vite plugin injects the picker automatically in dev.
ReactDOM.render(<App />, document.getElementById("root"));
