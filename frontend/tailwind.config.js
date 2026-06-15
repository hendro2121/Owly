/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0D4F4F',
          50: '#F0FAFA',
          100: '#D5F0F0',
          200: '#A3DEDE',
          300: '#6BC4C4',
          400: '#2A8A8A',
          500: '#0D4F4F',
          600: '#0A3D3D',
          700: '#082E2E',
          800: '#051F1F',
          900: '#031414',
        },
        grey: {
          50: '#F9F9F9', 100: '#F3F3F3', 200: '#E8E8E8', 300: '#D4D4D4',
          400: '#A3A3A3', 500: '#737373', 600: '#525252', 700: '#404040',
          800: '#262626', 900: '#171717',
        },
        buy: { DEFAULT: '#0D4F4F', bg: '#F0FAFA', border: '#A3DEDE' },
        sell: { DEFAULT: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        accent: {
          DEFAULT: '#0D4F4F',
          light: '#F0FAFA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        page: '1400px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.04)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        elevated: '0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(40px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up': {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        pulse: 'pulse 1.5s infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'count-up': 'count-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
