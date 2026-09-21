import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        primary: {
          DEFAULT: "#172033",
          light: "#232F48",
          dark: "#0F1624",
        },
        secondary: {
          DEFAULT: "#344054",
          light: "#475467",
          muted: "#667085",
        },
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          light: "#EFF6FF",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
          text: "#15803D",
        },
        warning: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
          text: "#B45309",
        },
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
          text: "#B91C1C",
        },
        border: {
          DEFAULT: "#E5E7EB",
          dark: "#D1D5DB",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
