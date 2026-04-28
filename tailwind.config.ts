import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        // Modern Professional Primary
        primary: {
          50: '#f0f4f9',
          100: '#e1e8f0',
          200: '#c3d1e0',
          300: '#a5bad1',
          400: '#87a3c2',
          500: '#5a7fa8',
          600: '#4a6a8f',
          700: '#3a5576',
          800: '#2a405d',
          900: '#1a2b44',
        },
        // Modern Professional Neutral (replaces gold/slate)
        neutral: {
          0: '#ffffff',
          50: '#fafbfc',
          100: '#f4f6f8',
          200: '#e8ecf0',
          300: '#dce2e8',
          400: '#c4ccd4',
          500: '#a8b2bc',
          600: '#8c96a2',
          700: '#707a88',
          800: '#545e6e',
          900: '#384854',
        },
        // Keep gold for backward compatibility during transition
        gold: {
          50: '#f0f4f9',
          100: '#e1e8f0',
          200: '#c3d1e0',
          300: '#a5bad1',
          400: '#87a3c2',
          500: '#5a7fa8',
          600: '#4a6a8f',
          700: '#3a5576',
          800: '#2a405d',
          900: '#1a2b44',
        },
        stage: {
          navy: '#1e3a8a',
          sage: '#65a30d',
          gold: '#5a7fa8',
          coral: '#ef4444',
          slate: '#545e6e',
        },
      },
      boxShadow: {
        'refined': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'elevated': '0 12px 32px rgba(0, 0, 0, 0.16)',
        'hover': '0 16px 48px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        xs: '0.375rem',
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.5rem', { lineHeight: '3rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in forwards',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
