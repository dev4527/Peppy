/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ✅ UNIQUE TRIGGER HOOK FOR DARK/LIGHT MODE MULTI-THEMING
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        peppy: {
          light: '#f3f4f6',
          brand: '#ff4757', // Peppy signature accent preserved 🚀
          dark: '#2f3542',
        }
      }
    },
  },
  plugins: [],
}