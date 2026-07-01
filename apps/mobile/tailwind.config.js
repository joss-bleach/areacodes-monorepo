/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semibold": ["Poppins_600SemiBold"],
        "poppins-bold": ["Poppins_700Bold"],
      },
      colors: {
        brand: {
          black: "#000000",
          white: "#F9F9F9",
          "dim-ink": "#A3A3A3",
          raised: "#111111",
          secondary: "#1F1F1F",
          border: "#2D2D2D",
          ring: "#888888",
          destructive: "#E03316",
        },
      },
    },
  },
  plugins: [],
};
