import type { Config } from "tailwindcss";

// Theme ตาม CI ของ THUS House of Traders
// - แอป (Dashboard / Admin): พื้นม่วงเข้มแบบแบนเนอร์โลโก้
// - หน้า Landing: พื้นกระดาษสีอ่อน + ตัวอักษรหนาสีเข้ม + gradient ม่วง/ฟ้า/ส้ม แบบสไลด์ THUS MEMBER BENEFITS
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#140e19",
        panel: "#1a1320",
        card: "#1d1624",
        raised: "#261d2e",
        line: "#2b2233",
        edge: "#3b3045",
        ink: "#f4f1f6",
        muted: "#aaa0b3",
        subtle: "#82788b",
        brand: { DEFAULT: "#7a5f96", light: "#c9b8dd", dark: "#473654" },
        plum: { 900: "#2d183c", 800: "#3a2449", 700: "#473654", 500: "#6a5c73", 300: "#a597ad" },
        paper: { DEFAULT: "#e3e2dd", light: "#efeee9" },
        charcoal: "#1f1f1f",
        glow: { lilac: "#ba94c7", blue: "#9195dc", orange: "#ec9e56", pink: "#e3a3a8" },
        danger: "#dc2626",
        success: "#22c55e",
        warning: "#f59e0b",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans Thai", "system-ui", "sans-serif"],
        display: ["Archivo", "IBM Plex Sans Thai", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
