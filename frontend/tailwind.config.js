/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        raven: {
          orange: '#FF5C00',
          'orange-light': '#FFF2EB',
          'orange-dark': '#CC4A00',
        },
        buy: { DEFAULT: '#10B981', bg: '#ECFDF5', border: '#6EE7B7' },
        sell: { DEFAULT: '#EF4444', bg: '#FEF2F2', border: '#FCA5A5' },
        grey: {
          50: '#FAFAFA', 100: '#F4F4F4', 200: '#E5E5E5', 300: '#D1D1D1',
          400: '#A0A0A0', 500: '#6E6E6E', 600: '#4A4A4A', 700: '#333333',
          800: '#1E1E1E', 900: '#141414',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Azeret Mono', 'monospace'],
      },
      maxWidth: {
        'page': '1500px',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        pulse: 'pulse 1.5s infinite',
      },
    },
  },
  plugins: [],
}
