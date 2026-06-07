/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          green: '#2d7a3a',
          light: '#34a34a',
          line: '#4caf50',
        },
      },
    },
  },
  plugins: [],
};
