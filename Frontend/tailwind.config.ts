import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#3B82F6",
          accent: "#D97706",
          glow: "#60A5FA",
        },
        surface: {
          DEFAULT: "#0A0A0F",
          card: "#111118",
          elevated: "#1A1A24",
          border: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        heading: ["Fira Code", "monospace"],
        body: ["Fira Sans", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(59,130,246,0.3)",
        "glow-amber": "0 0 20px rgba(217,119,6,0.3)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
