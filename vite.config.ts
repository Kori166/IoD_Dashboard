/*
  Vite setup for the React app.

  Provenance:
  - Main config structure is based on the Vite configuration docs:
    https://vite.dev/config/
  - Server options are based on Vite's server options docs:
    https://vite.dev/config/server-options.html
  - React plugin setup is based on the official @vitejs/plugin-react docs:
    https://www.npmjs.com/package/@vitejs/plugin-react
  - The "@" import shortcut follows Vite's resolve.alias docs:
    https://vite.dev/config/shared-options.html#resolve-alias
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