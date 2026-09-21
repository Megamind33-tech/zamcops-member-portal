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
        // The ZAMCOPS palette — the society's orange, the Zambian flag's red
        // and green, on warm paper. This is the whole system; the member
        // portal and the staff console both draw from it and nothing else.
        zam: {
          orange: "#F26C21",
          "orange-dark": "#D85A14",
          "orange-soft": "#FEF1E8",
          red: "#E2342B",
          green: "#2BA45A",
          "green-soft": "#E7F6EE",
          amber: "#F5A623",
          "amber-soft": "#FEF4E2",
          blue: "#2F6FED",
          "blue-soft": "#E9F0FE",
          ink: "#1C1917",
          muted: "#6B6158",
          line: "#E6DDD0",
          canvas: "#F3EEE6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        // Light "zam" elevation (ported from the reference design).
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        "card-lg": "0 4px 16px rgba(16,24,40,0.08)",
        nav: "0 -1px 0 rgba(16,24,40,0.04) inset, 0 -10px 30px rgba(16,24,40,0.06)",
      },
      maxWidth: {
        app: "480px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        equalize: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
        equalize: "equalize 1.1s ease-in-out infinite",
        shimmer: "shimmer 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
