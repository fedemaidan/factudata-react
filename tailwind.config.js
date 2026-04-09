/** @type {import('tailwindcss').Config} */
/* Palette aligned with src/theme/colors.js + create-palette.js */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          lightest: '#F5F7FF',
          light: '#EBEEFE',
          DEFAULT: '#6366F1',
          main: '#6366F1',
          dark: '#4338CA',
          darkest: '#312E81',
        },
        neutral: {
          50: '#F8F9FA',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D2D6DB',
          400: '#9DA4AE',
          500: '#6C737F',
          600: '#4D5761',
          700: '#2F3746',
          800: '#1C2536',
          900: '#111927',
        },
        success: {
          main: '#10B981',
          dark: '#0B815A',
        },
        warning: {
          main: '#F79009',
          dark: '#B54708',
        },
        error: {
          main: '#F04438',
          dark: '#B42318',
        },
        info: {
          main: '#06AED4',
          dark: '#0E7090',
        },
        divider: '#F2F4F7',
      },
    },
  },
  plugins: [],
};
