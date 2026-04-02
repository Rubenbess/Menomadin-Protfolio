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
        gold: {
          50: '#fdfbf7',
          100: '#faf5ee',
          200: '#f5ebdd',
          300: '#ead1b8',
          400: '#d4a76d',
          500: '#b8956a',
          600: '#9d7f5a',
          700: '#7a634e',
          800: '#5a4a3a',
          900: '#3d342a',
        },
        stage: {
          navy: '#1e3a8a',
          sage: '#65a30d',
          gold: '#b8956a',
          coral: '#dc2626',
          slate: '#64748b',
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
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
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
