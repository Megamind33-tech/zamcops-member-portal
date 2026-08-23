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
        // ZAMCOPS — "Midnight Studio" premium music-app palette.
        // Primary accent: an electric indigo that reads as energetic, not corporate.
        brand: {
          50: "#eef1ff",
          100: "#dbe1ff",
          200: "#bcc6ff",
          300: "#93a2ff",
          400: "#6f80ff",
          500: "#5460f8", // primary accent
          600: "#4445e6",
          700: "#3733bf",
          800: "#2c2c94",
          900: "#1e1f63",
        },
        // Violet companion used for vibrant gradients (the music "energy").
        iris: {
          300: "#c4a8ff",
          400: "#a87dff",
          500: "#8b5cf6",
          600: "#7338e0",
          700: "#5a27b3",
        },
        // Warm amber accent — CTAs, highlights, royalty/value moments.
        gold: {
          300: "#ffd98a",
          400: "#ffc24d",
          500: "#f5a623", // accent
          600: "#d9871a",
        },
        // Hot magenta used very sparingly for "live"/energetic flourishes.
        pop: {
          400: "#ff6fae",
          500: "#f63d8b",
        },
        // Signature ACTION accent — warm amber/copper, the colour of stage
        // lighting and vinyl sleeves rather than another fintech mint. Primary
        // CTAs are a confident solid of this (no gradient).
        accent: {
          300: "#ffcf99",
          400: "#ffac5c",
          500: "#ff8a3d",
          600: "#e8630a",
          700: "#b84d08",
        },
        // Dark neutral surface scale — the canvas the whole app sits on.
        night: {
          50: "#f5f6fb",
          100: "#e4e6f0",
          200: "#c2c6d8",
          300: "#9aa0b8",
          400: "#6b7190",
          500: "#474d68",
          600: "#2f3450",
          700: "#222640",
          800: "#181b30",
          850: "#141627",
          900: "#0d0f1d",
          950: "#070814",
        },
        ink: "#f5f6fb",
        canvas: "#0b0d1a",
        // ZAMCOPS "zam" institutional light palette (ported from the Magic
        // Patterns design). Zambian-flag colour family — eagle orange + red +
        // green over clean paper. Used by the staff console and brand flourishes.
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
