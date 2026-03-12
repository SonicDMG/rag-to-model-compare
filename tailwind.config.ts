import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Unkey-inspired color palette
        "unkey-black": "#000000",
        "unkey-gray": {
          950: "#0a0a0a",
          900: "#0f0f0f",
          850: "#141414",
          800: "#1a1a1a",
          700: "#1f1f1f",
          600: "#2a2a2a",
          500: "#52525b",
          400: "#6b7280",
          300: "#9ca3af",
          200: "#a1a1a1",
        },
        "unkey-teal": {
          500: "#14b8a6",
          400: "#2dd4bf",
        },
        success: "#10b981",
        purple: "#a855f7",
        blue: "#3b82f6",
        pink: "#ec4899",
      },
      borderRadius: {
        "unkey-sm": "6px",
        "unkey-md": "8px",
        "unkey-lg": "12px",
        "unkey-xl": "16px",
      },
      boxShadow: {
        "unkey-card": "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
        "unkey-glow": "0 0 20px rgba(20, 184, 166, 0.3), 0 0 40px rgba(45, 212, 191, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;

// Made with Bob
