/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0B1121', // Dark blue/slate background
        card: '#151F32', // Slightly lighter for cards
        primary: '#2563EB', // Blue button
        secondary: '#64748B', // Gray text
        accent: '#22D3EE', // Cyan accent
        success: '#10B981', // Green
        warning: '#F59E0B', // Amber
        danger: '#EF4444', // Red
      }
    },
  },
  plugins: [],
}
