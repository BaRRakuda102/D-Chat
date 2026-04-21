/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mac: {
          bg: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          glass: 'var(--bg-glass)',
          sidebar: 'var(--bg-sidebar)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          text: 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          border: 'var(--border)',
        }
      },
      borderRadius: {
        'mac': '16px',
        'mac-lg': '24px',
      }
    },
  },
  plugins: [],
}