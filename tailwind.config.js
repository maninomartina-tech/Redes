/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f1ff',
          100: '#e9e5ff',
          200: '#d6cfff',
          300: '#b9abff',
          400: '#977dff',
          500: '#7a54f7',
          600: '#6a3aeb',
          700: '#5b2bcf',
          800: '#4c25a7',
          900: '#402186',
        },
        ink: {
          50: '#f7f7f9',
          100: '#eeeef2',
          200: '#d9dae1',
          300: '#b7b9c6',
          400: '#8f92a6',
          500: '#6f7288',
          600: '#585b70',
          700: '#484a5c',
          800: '#3d3e4d',
          900: '#2a2b36',
          950: '#1a1b22',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,18,27,0.04), 0 4px 16px rgba(16,18,27,0.06)',
        card: '0 1px 3px rgba(16,18,27,0.05), 0 8px 30px rgba(16,18,27,0.05)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
