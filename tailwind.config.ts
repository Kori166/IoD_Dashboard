/*
  Tailwind CSS setup for the app.

  This file controls dark mode, scanned source files, theme values,
  custom colours, animations, and Tailwind plugins.

  Provenance:
  - Tailwind Labs (no date) ‘Configuration’ [online]. Available from:
    https://tailwindcss.com/docs/configuration 
    Used for the main Tailwind config structure.

  - Tailwind Labs (no date) ‘Detecting classes in source files’ [online]. Available from:
    https://tailwindcss.com/docs/detecting-classes-in-source-files 
    Used for the content file paths.

  - Tailwind Labs (no date) ‘Dark mode’ [online]. Available from:
    https://tailwindcss.com/docs/dark-mode 
    Used for the class-based dark mode setting.

  - Tailwind Labs (no date) ‘Theme variables’ [online]. Available from:
    https://tailwindcss.com/docs/theme 
    Used for the extended theme values, colours, fonts, and radius setings.

  - Tailwind Labs (no date) ‘Animation’ [online]. Available from:
    https://tailwindcss.com/docs/animation 
    Used for the custom keyfames and animation settings.

  - npm (no date) ‘tailwindcss-animate’ [online]. Available from:
    https://www.npmjs.com/package/tailwindcss-animate 
    Used for the Tailwind animation plugin.

  - shadcn (no date) ‘Installation’ [online]. Available from:
    https://ui.shadcn.com/docs/installation 
    Used for the CSS variable colour pattern and acordion animation setup.
*/

import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"], // Uses a class on the page to switch dark mode on or off
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"], // Tells Tailwind where to look for class names
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: { // Sets the main fonts used by the app
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: { // Maps Tailwind colour names to CSS variables from the app theme
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        cyan: {
          glow: "hsl(var(--glow-cyan))",
        },
        violet: {
          glow: "hsl(var(--glow-violet))",
        },
        magenta: {
          glow: "hsl(var(--glow-magenta))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: { // Uses one shared radius value for rounded corners
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: { // Defines custom motion effects used by the interface
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: { // Connect the custom keyfames to Tailwind animatio classes
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // Adds extra animation utility classes
} satisfies Config;
