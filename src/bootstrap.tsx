import { createRoot } from "react-dom/client";

import { StandaloneApp } from "./app/standalone-app";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found");
}

createRoot(rootElement).render(<StandaloneApp />);
