/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem',
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          950: "#090A09",
          900: "#0E100F",
          850: "#131514",
          800: "#181B19",
          750: "#1D211F",
          700: "#242824",
          500: "#6F746E",
          400: "#9A9F98",
          300: "#C3C8C0",
          100: "#F3F5F0",
        },
        sage: {
          500: "#A8BA9A",
          400: "#C3D0B8",
        },
      },
      boxShadow: {
        dock: "0 18px 60px rgba(0,0,0,0.42)",
        hover: "0 18px 42px rgba(0,0,0,0.28)",
      },
    },
  },
  plugins: [],
};
