/*
  Main React entry file for the app.

  This file loads the app's CSS, finds the root HTML element, and renders the React app inside the LadProvider context.

  Provenance:
  - React (no date) ‘createRoot’ [online]. Available from:
    https://react.dev/reference/react-dom/client/createRoot 
    Used for rendering the React app into the root HTML element.

  - Vite (no date) ‘Features’ [online]. Available from:
    https://vite.dev/guide/features.html 
    Used for importing CSS directly into the app entry file.

  - React (no date) ‘Passing Data Deeply with Context’ [online]. Available from:
    https://react.dev/learn/passing-data-deeply-with-context 
    Used for wrapping the app in a context provider.
*/

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LadProvider } from "@/context/lad-context";

// Starts the app inside the root element from index.html
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  // Provides shared Local Authority District data to the app
  <LadProvider>
    <App />
  </LadProvider>,
);