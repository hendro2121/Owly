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
          800: '#262626', 900: '#0A0A0A',
        },
        lime: {
          DEFAULT: '#D4F000',
          50: '#FBFFE6',
          100: '#F4FFB8',
          200: '#EAFC7A',
          300: '#DEF53D',
          400: '#D4F000',
          500: '#BCD400',
          600: '#97AB00',
          700: '#717F00',
        },
        buy: { DEFAULT: '#0A0A0A', bg: '#FBFFE6', border: '#EAFC7A' },
        sell: { DEFAULT: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
        accent: {
          DEFAULT: '#D4F000',
          light: '#FBFFE6',
        },
        // Soft "Mac" surfaces — modern light grey base + Semaloop-style sage
        paper: '#E7E7E4',
        sage: {
          50: '#F2F5EE', 100: '#E8EDE1', 200: '#D5E0C9', 300: '#C4D4B4', 400: '#A8BC94',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        page: '1400px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.04)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        elevated: '0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        soft: '0 2px 8px -2px rgba(30,35,25,0.06), 0 12px 32px -8px rgba(30,35,25,0.08)',
        floaty: '0 18px 50px -16px rgba(30,40,25,0.22), 0 2px 8px -2px rgba(30,40,25,0.06)',
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
        'flip-in': {
          '0%': { opacity: '0', transform: 'rotateY(38deg)' },
          '100%': { opacity: '1', transform: 'rotateY(0deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        pulse: 'pulse 1.5s infinite',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'count-up': 'count-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'flip-in': 'flip-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
