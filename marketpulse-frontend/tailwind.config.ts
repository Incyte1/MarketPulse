import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mpbg: "#070b14",
        mppanel: "#0f172a",
        mppanel2: "#111827",
        mpborder: "rgba(255,255,255,0.08)",
      },
      boxShadow: {
        panel: "0 8px 30px rgba(0,0,0,0.22)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.5rem",
      }
    },
  },
  plugins: [],
};

export default config;
