import type { Config } from "tailwindcss";

// Theme จาก thushouse_prototype.html — ดำ + ม่วง
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d12",
        panel: "#10131a",
        card: "#12151b",
        raised: "#171a21",
        line: "#20232b",
        edge: "#292d38",
        ink: "#f4f5f7",
        muted: "#9298a6",
        subtle: "#737988",
        brand: { DEFAULT: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed" },
        danger: "#dc2626",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans Thai", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
