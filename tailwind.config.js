/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "zamcops-orange": "#f59e0b",
        "pastel-mint": "#34d399",
        "pastel-pink": "#f87171",
      },
    },
  },
  plugins: [],
}
