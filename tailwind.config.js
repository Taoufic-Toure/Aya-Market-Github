/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf7',
          100: '#dcfcee',
          200: '#bbf7de',
          300: '#86efbf',
          400: '#4ade9e',
          500: '#1D9E75',
          600: '#178a64',
          700: '#146b4f',
          800: '#125540',
          900: '#0f4534',
          dark: '#0f3d2e',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#EF9F27',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-slow': 'fadeIn 0.7s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
