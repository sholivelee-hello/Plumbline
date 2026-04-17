import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          50: "#F0F0FA",
          100: "#E0E0F5",
          200: "#C2C2EB",
          300: "#A3A3E0",
          400: "#8A8ADD",
          500: "#7575D8",
          600: "#5C5CB8",
          700: "#4A4A98",
          800: "#383878",
          900: "#262658",
        },
        // Phase 2-2: 6개 카테고리별 시맨틱 컬러
        heaven: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        // Finance 4-group design system colors
        obligation: {
          DEFAULT: "#1E3A5F",
          light: "#93B8E8",
        },
        necessity: {
          DEFAULT: "#059669",
          light: "#6EE7B7",
        },
        sowing: {
          DEFAULT: "#7C3AED",
          light: "#C4B5FD",
        },
        want: {
          DEFAULT: "#EA580C",
          light: "#FDBA74",
        },
        // Functional finance colors
        income: "#16A34A",
        expense: "#DC2626",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.1)",
      },
      keyframes: {
        "check-bounce": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
        "slide-up-fade": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "confetti-pop": {
          "0%": { transform: "scale(0) rotate(0)", opacity: "1" },
          "60%": { transform: "scale(1.1) rotate(180deg)", opacity: "1" },
          "100%": { transform: "scale(0.9) rotate(360deg)", opacity: "0" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px)" },
          "40%": { transform: "translateX(4px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(2px)" },
        },
      },
      animation: {
        "check-bounce": "check-bounce 0.35s ease-out",
        "slide-up-fade": "slide-up-fade 0.3s ease-out",
        "confetti-pop": "confetti-pop 1.2s ease-out forwards",
        "shake": "shake 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
