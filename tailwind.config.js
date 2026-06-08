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
        // ZAMCOPS institutional palette — deep blue + gold accent
        brand: {
          50: "#eef5fb",
          100: "#d6e7f5",
          200: "#aecfe9",
          300: "#7fb0d8",
          400: "#4f8cc2",
          500: "#2f6da6",
          600: "#1f4f7e", // primary
          700: "#173d61",
          800: "#102d49",
          900: "#0a1f33",
        },
        gold: {
          400: "#e6b94d",
          500: "#d4a02c", // accent
          600: "#b3851f",
        },
        ink: "#0f1b27",
        canvas: "#f4f6f9",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,45,73,0.06), 0 18px 40px rgba(16,45,73,0.08)",
        nav: "0 -1px 0 rgba(16,45,73,0.05), 0 -12px 32px rgba(16,45,73,0.08)",
        fab: "0 12px 30px rgba(31,79,126,0.35)",
        glow: "0 18px 48px rgba(212,160,44,0.16)",
      },
      maxWidth: {
        app: "480px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
