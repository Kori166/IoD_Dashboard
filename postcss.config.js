/*
  A simple PostCSS setup for the app.

  This file tells PostCSS to use Tailwind CSS and Autoprefixer (PostCSS plugin) when building the app's styles.

  Provenance:
  - PostCSS (no date) ‘PostCSS’ [online]. Available from:
    https://postcss.org/ 
    Used for the main PostCSS plugin setup.

  - Tailwind Labs (no date) ‘Using PostCSS’ [online]. Available from:
    https://tailwindcss.com/docs/installation/using-postcss 
    Used for connecting Tailwind CSS to PostCSS.

  - npm (no date) ‘Autoprefixer’ [online]. Available from:
    https://www.npmjs.com/package/autoprefixer 
    Used for the Autoprefixer plugin setup.
*/

export default {
  plugins: { // Runs Tailwind and adds browser prefixes to CSS
    tailwindcss: {},
    autoprefixer: {},
  },
};
