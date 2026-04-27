import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#1c1c1c",
          offwhite: "#fafafa",
          warm: "#b8ada4",
          border: "#d6d1cb",
          input: "#f4f1ee",
          accent: "#c9a96e",
        },
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
