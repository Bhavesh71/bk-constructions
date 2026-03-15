import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'DM Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EEEEFF',
          100: '#D9D9FF',
          200: '#B3B3FF',
          300: '#8D87FF',
          400: '#6B61FF',
          500: '#4F46E5',
          600: '#3E36CC',
          700: '#2E28A8',
          800: '#1F1B80',
          900: '#120F56',
        },
        sidebar: '#0F172A',
        surface: '#F9FAFB',
        card: '#FFFFFF',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Dark mode surfaces
        'dark-surface': '#0F172A',
        'dark-card': '#1E293B',
        'dark-border': '#334155',
        'dark-muted': '#94A3B8',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'card-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'dark-card': '0 1px 3px 0 rgba(0,0,0,0.4)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'loading-bar': {
          '0%':   { width: '0%',   opacity: '1' },
          '100%': { width: '100%', opacity: '0.85' },
        },
        'tab-fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'loading-bar': 'loading-bar 0.45s ease-out forwards',
        'tab-fade-in': 'tab-fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
export default config
