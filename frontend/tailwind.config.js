/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        navy:        "#0a2540",
        deepOcean:   "#0d2137",
        oceanBlue:   "#1e60d5",
        skyBlue:     "#0284c7",
        saffron:     "#ff9933",
        accentOrange:"#ff6f00",
        // Surface system
        surface:     "#f0f4f9",
        surfaceCard: "#ffffff",
        surfaceMid:  "#e8eef6",
        surfaceDark: "#dce6f0",
        // Status
        safeGreen:   "#00c853",
        safeLight:   "#e8f5e9",
        warningAmber:"#ffb300",
        warningLight:"#fff8e1",
        dangerRed:   "#e53935",
        dangerLight: "#ffebee",
        moderateOrange: "#ff7043",
        // Text
        textPrimary:  "#0a2540",
        textSecond:   "#4a6080",
        textMuted:    "#8aa0b8",
        // Borders
        borderLight:  "#e2eaf4",
        borderMid:    "#c8d8e8",
      },
      fontFamily: {
        sans: ["'Noto Sans'", "Inter", "system-ui", "sans-serif"],
        heading: ["'Noto Sans'", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 4px 0 rgba(10,37,64,0.07), 0 4px 16px 0 rgba(10,37,64,0.05)",
        cardHover: "0 4px 20px 0 rgba(10,37,64,0.13)",
        nav: "0 2px 12px 0 rgba(10,37,64,0.08)",
        topbar: "0 1px 0 0 #e2eaf4",
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.25rem",
        xl4: "1.5rem",
      },
      animation: {
        pulse2: "pulse2 2s ease-in-out infinite",
        fadeIn: "fadeIn 0.2s ease-out",
        slideIn: "slideIn 0.25s ease-out",
      },
      keyframes: {
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0.4" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}
