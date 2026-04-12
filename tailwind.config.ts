import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: { 50: "#fefcf8", 100: "#fdf6ee", 200: "#f9e8d4", 300: "#f0d4b4" },
        sage: { 50: "#f4f8f4", 100: "#e8f0e8", 200: "#c8dcc8", 300: "#a8c8a8" },
        sky: { 50: "#f0f4f8", 100: "#e0e8f0", 200: "#c8d4e8", 300: "#a8b8d0" },
        warm: { 50: "#faf8f5", 100: "#f5f0e8", 200: "#e8dcd0", 300: "#d4c4b0", 400: "#b8a48c", 500: "#9c8470", 600: "#7c6854", 700: "#5c4c3c" },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
