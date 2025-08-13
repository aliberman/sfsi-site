import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:"#effaf8",100:"#d5f3ec",200:"#a9e7d9",300:"#73d7c3",400:"#44c5ae",500:"#1eb398",600:"#139c84",700:"#107c69",800:"#0e6154",900:"#0c4f45" },
        gold: "#D4AF37",
        coral: "#ff7a70",
        navy: "#0e1a2b",
      },
      backgroundImage: {
        "hero-overlay": "linear-gradient(210deg, rgba(14,26,43,.75), rgba(14,26,43,.35))",
      },
    },
  },
  plugins: [],
};
export default config;
