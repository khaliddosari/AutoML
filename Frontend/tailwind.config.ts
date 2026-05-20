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
          primary: "#2563EB",
          dark: "#1D4ED8",
          light: "#EFF6FF",
          border: "#BFDBFE",
          muted: "#93C5FD",
        },
        surface: {
          DEFAULT: "#F7F9FC",
          card: "#FFFFFF",
          elevated: "#F1F5F9",
          border: "#E2E8F0",
          hover: "#F8FAFF",
        },
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)",
        "card-md": "0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
        "card-lg": "0 8px 24px rgba(15,23,42,0.1), 0 4px 8px rgba(15,23,42,0.06)",
        focus: "0 0 0 3px rgba(37,99,235,0.18)",
        "focus-inset": "inset 0 0 0 2px rgba(37,99,235,0.5)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite",
        "fade-up": "fadeUp 0.3s ease-out both",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
