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
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f9f7f4',
          100: '#f3ede5',
          200: '#e6dcd0',
          300: '#d4a574',
          400: '#c9a961',
          500: '#b8954e',
          600: '#a68240',
          700: '#916f38',
          800: '#7c5a2e',
          900: '#4a3620',
          950: '#1a1f35',
        },
        slate: {
          50:  '#f8f9fa',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.03)',
        'card-hover': '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)',
        'lg': '0 20px 25px -5px rgba(0,0,0,0.08)',
        'xl': '0 25px 50px -12px rgba(0,0,0,0.1)',
      },
      borderRadius: {
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-delay': 'fadeIn 0.4s ease-out 0.1s backwards',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-up-delay': 'slideUp 0.4s ease-out 0.15s backwards',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
