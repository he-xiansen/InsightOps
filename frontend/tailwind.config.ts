import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
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
        "primary-container": "var(--primary-container)",
        "on-primary-container": "var(--on-primary-container)",
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
        surface: "var(--surface)",
        "surface-container": "var(--surface-container)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--foreground)",
        "on-surface-variant": "var(--on-surface-variant)",
        outline: "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        tertiary: "var(--tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "tertiary-fixed-dim": "var(--tertiary)",
        error: "hsl(var(--destructive))",
        "error-container": "var(--error-container)",
      },
      fontFamily: {
        "label-md": ["Inter", "system-ui", "sans-serif"],
        "body-md": ["Inter", "system-ui", "sans-serif"],
        "headline-md": ["Inter", "system-ui", "sans-serif"],
        "body-lg": ["Inter", "system-ui", "sans-serif"],
        "data-mono": ["JetBrains Mono", "monospace"],
        "headline-lg": ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "label-md": ["13px", { lineHeight: "1.5", letterSpacing: "0.01em", fontWeight: "500" }],
        "body-md": ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-md": ["22px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["17px", { lineHeight: "1.7", fontWeight: "400" }],
        "data-mono": ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-lg": ["30px", { lineHeight: "1.3", fontWeight: "600" }],
        display: ["38px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
      },
      boxShadow: {
        shell: "0 24px 60px rgba(15, 23, 42, 0.35)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
