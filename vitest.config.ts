/*
  Vitest configuration for the React app.
 
  Provenance:
  - Overall config structure is derived from the Vitest configration docs:
    https://vitest.dev/config/
  - React plugin setup is derived from the official @vitejs/plugin-react package docs:
    https://www.npmjs.com/package/@vitejs/plugin-react
  - The "@" import alias follows Vite's documented resolve.alias pattern:
    https://vite.dev/config/shared-options.html#resolve-alias
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";


export default defineConfig({  
  plugins: [react()], //Enables React support for Vite, including JSX handling.
  test: { //Runs React tests in jsdom and loads the shared test setup.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: { // Lets files use "@/..." instead of long relative paths.
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
