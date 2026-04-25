/*
  ESLint setup for the React and TypeScript app.

  This file sets the linting rules for TypeScript files, React hooks, browser globals, and React Fast Refresh.

  Provenance:
  - ESLint (no date) ‘Configure ESLint’ [online]. Available from:
    https://eslint.org/docs/latest/use/configure/ 
    Used for the main ESLint flat config structure.

  - ESLint (no date) ‘@eslint/js’ [online]. Available from:
    https://eslint.org/docs/latest/use/configure/configuration-files#using-predefined-configurations 
    Used for the recommened JavaScript rules.

  - typescript-eslint (no date) ‘Getting Started’ [online]. Available from:
    https://typescript-eslint.io/getting-started/ 
    Used for the TypeScript ESLint config setup.

  - npm (no date) ‘globals’ [online]. Available from:
    https://www.npmjs.com/package/globals 
    Used for the browser global variables.

  - React (no date) ‘eslint-plugin-react-hooks’ [online]. Available from:
    https://www.npmjs.com/package/eslint-plugin-react-hooks 
    Used for the React hooks linting rules.

  - npm (no date) ‘eslint-plugin-react-refresh’ [online]. Available from:
    https://www.npmjs.com/package/eslint-plugin-react-refresh 
    Used for the React Fast Refresh lnting rule.
*/

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] }, // Ignores built files
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended], // Uses recommended JavaScript and TypeScript linting rules
    files: ["**/*.{ts,tsx}"], // Applies this config to TypeScript source files
    languageOptions: { // Sets the JavaScript version and browser globals
      ecmaVersion: 2020,
      globals: globals.browser,
    }, 
    plugins: { // Adds React-specific linting plugins
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: { // Sets project-specific linting rules
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
