import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  blocklist: ["[--cell-size:--spacing(8)]"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom warm color palette
        cream: {
          50: "#FEFDFB",
          100: "#FDF9F0",
          200: "#FAF1E4",
          300: "#F6E8D7",
          400: "#F0D9C4",
          500: "#E8C8A0",
          600: "#D4A574",
          700: "#B8834A",
          800: "#8B5A2B",
          900: "#5D3A1C",
        },
        warm: {
          50: "#FFFBF5",
          100: "#FFF7ED",
          200: "#FFEDD5",
          300: "#FED7AA",
          400: "#FDBA74",
          500: "#FB923C",
          600: "#F97316",
          700: "#EA580C",
          800: "#C2410C",
          900: "#9A3412",
        },
        // Trinai Survey Dashboard
        survey: {
          bg: "#F8F9FA",
          primary: "#3A8DFF",
          "primary-end": "#2196F3",
          orange: "#FFC107",
          green: "#4CAF50",
          purple: "#7B61FF",
          "text-primary": "#333333",
          "text-secondary": "#666666",
          "text-muted": "#999999",
          "progress-track": "#E0E0E0",
        },
        // Override gray so all inner pages use Trinai theme (bg-gray-50, text-gray-900, border-gray-200, etc.)
        gray: {
          50: "#F8F9FA",
          100: "#F5F5F5",
          200: "#E0E0E0",
          300: "#E0E0E0",
          400: "#BDBDBD",
          500: "#999999",
          600: "#666666",
          700: "#666666",
          800: "#333333",
          900: "#333333",
          950: "#333333",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "warm-gradient": "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)",
        "cream-gradient": "linear-gradient(135deg, #FEFDFB 0%, #FDF9F0 50%, #FAF1E4 100%)",
        "survey-primary": "linear-gradient(to right, #3A8DFF, #2196F3)",
      },
      animation: {
        blob: "blob 7s infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
        glow: {
          "0%": {
            boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
          },
          "100%": {
            boxShadow: "0 0 30px rgba(245, 158, 11, 0.6)",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "3rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
