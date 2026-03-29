/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#0F172A",
        mist: "#E2E8F0",
        pop: "#F97316",
        ok: "#10B981",
        warn: "#F59E0B",
        bad: "#EF4444"
      },
      fontFamily: {
        sans: ["Manrope", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
