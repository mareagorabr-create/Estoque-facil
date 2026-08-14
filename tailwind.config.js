/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#22C55E",
          dark: "#16A34A",
        },
        warning: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
        },
        danger: {
          DEFAULT: "#EF4444",
          dark: "#DC2626",
        },
        success: "#16A34A",
        surface: "#F8FAFC",
      },
    },
  },
  plugins: [],
};
