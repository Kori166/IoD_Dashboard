import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { LadProvider } from "@/context/lad-context";

createRoot(document.getElementById("root")!).render(
  <LadProvider>
    <App />
  </LadProvider>,
);