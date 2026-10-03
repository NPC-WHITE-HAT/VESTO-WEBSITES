/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f5',
          100: '#eeede9',
          200: '#d9d8d2',
          300: '#b8b6ad',
          400: '#8e8c81',
          500: '#6c6a5f',
          600: '#54524a',
          700: '#3f3d37',
          800: '#2a2925',
          900: '#1a1916',
          950: '#0d0d0b',
        },
        sand: {
          50: '#faf8f4',
          100: '#f3efe7',
          200: '#e7e0d2',
          300: '#d6cbb6',
          400: '#c1b294',
          500: '#a89870',
        },
        accent: {
          DEFAULT: '#b08a4a',
          dark: '#8a6a36',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.25em',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};
