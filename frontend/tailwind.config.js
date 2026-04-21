/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telegram: {
          blue: '#0088cc',
          light: '#f5f5f5',
          message: '#effdde',
          messageOut: '#eeffde',
          bg: '#ffffff',
          sidebar: '#f5f5f5',
          header: '#ffffff',
          text: '#000000',
          secondary: '#707579'
        }
      }
    },
  },
  plugins: [],
}