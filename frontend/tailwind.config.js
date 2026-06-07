/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Cabinet Grotesk'", "'Manrope'", "system-ui", "sans-serif"],
        body: ["'Manrope'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        sand: {
          50: "rgb(var(--sand-50) / <alpha-value>)",
          100: "rgb(var(--sand-100) / <alpha-value>)",
          200: "rgb(var(--sand-200) / <alpha-value>)",
          300: "rgb(var(--sand-300) / <alpha-value>)",
        },
        clinic: {
          navy: "rgb(var(--clinic-navy) / <alpha-value>)",
          "navy-hover": "rgb(var(--clinic-navy-hover) / <alpha-value>)",
          forest: "rgb(var(--clinic-forest) / <alpha-value>)",
          "forest-hover": "rgb(var(--clinic-forest-hover) / <alpha-value>)",
          sage: "rgb(var(--clinic-sage) / <alpha-value>)",
          sageDeep: "rgb(var(--clinic-sage-deep) / <alpha-value>)",
          red: "rgb(var(--clinic-red) / <alpha-value>)",
          "red-hover": "rgb(var(--clinic-red-hover) / <alpha-value>)",
          "red-soft": "rgb(var(--clinic-red-soft) / <alpha-value>)",
          peach: "rgb(var(--clinic-peach) / <alpha-value>)",
          peachDeep: "rgb(var(--clinic-peach-deep) / <alpha-value>)",
          cream: "rgb(var(--clinic-cream) / <alpha-value>)",
          amber: "rgb(var(--clinic-amber) / <alpha-value>)",
          "amber-soft": "rgb(var(--clinic-amber-soft) / <alpha-value>)",
          ink: "rgb(var(--clinic-ink) / <alpha-value>)",
          mist: "rgb(var(--clinic-mist) / <alpha-value>)",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(44,85,69,0.20)" },
          "50%": { boxShadow: "0 0 0 10px rgba(44,85,69,0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.7s ease-out both",
        "soft-pulse": "soft-pulse 2.4s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

