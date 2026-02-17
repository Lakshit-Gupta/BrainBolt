import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        'bb-bg': 'var(--color-bg-primary)',
        'bb-surface': 'var(--color-bg-surface)',
        'bb-elevated': 'var(--color-bg-elevated)',
        'bb-border': 'var(--color-border)',
        'bb-accent': 'var(--color-accent)',
        'bb-accent-hover': 'var(--color-accent-hover)',
        'bb-success': 'var(--color-success)',
        'bb-error': 'var(--color-error)',
        'bb-text': 'var(--color-text-primary)',
        'bb-muted': 'var(--color-text-secondary)',
      },
      borderRadius: {
        'bb-sm': 'var(--radius-sm)',
        'bb-md': 'var(--radius-md)',
        'bb-lg': 'var(--radius-lg)',
        'bb-xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'bb-card': 'var(--shadow-card)',
        'bb-elevated': 'var(--shadow-elevated)',
      },
      fontSize: {
        'bb-xs': 'var(--font-size-xs)',
        'bb-sm': 'var(--font-size-sm)',
        'bb-base': 'var(--font-size-base)',
        'bb-lg': 'var(--font-size-lg)',
        'bb-xl': 'var(--font-size-xl)',
        'bb-2xl': 'var(--font-size-2xl)',
        'bb-3xl': 'var(--font-size-3xl)',
      },
    },
  },
  plugins: [],
};

export default config;
