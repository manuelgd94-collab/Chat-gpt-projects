/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ok: '#16a34a',
        warn: '#eab308',
        bad: '#dc2626',
      },
    },
  },
  plugins: [],
};
