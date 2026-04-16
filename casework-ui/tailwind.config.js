/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"GDS Transport"', 'Arial', 'sans-serif'],
      },
      colors: {
        govuk: {
          blue: '#1d70b8',
          'blue-dark': '#003078',
          yellow: '#ffdd00',
          green: '#00703c',
          red: '#d4351c',
          orange: '#f47738',
          purple: '#4c2c92',
          black: '#0b0c0c',
          'grey-1': '#f3f2f1',
          'grey-2': '#b1b4b6',
          'grey-3': '#505a5f',
          'grey-4': '#6f777b',
        },
      },
    },
  },
  plugins: [],
}