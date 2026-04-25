/*
  Vite setup for the React app.

  Provenance:
  - Vite (2025) ‘Configuring Vite’ [online]. Available from:
    https://vite.dev/config/ 
    Used for the main Vite config structure.

  - Vite (2025) ‘Server Options’ [online]. Available from:
    https://vite.dev/config/server-options.html 
    Used for the dev server settings.

  - npm (2025) ‘@vitejs/plugin-react’ [online]. Available from:
    https://www.npmjs.com/package/@vitejs/plugin-react 
    Used for the React plugin setup.

  - Vite (2025) ‘Shared Options’ [online]. Available from:
    https://vite.dev/config/shared-options.html#resolve-alias 
    Used for the "@" import shortcut.
*/

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: { // Sets the local dev server options.
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()], // Adds React support to Vite.
  resolve: { // Lets files use "@/..." insted of long relative paths.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});