/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo blanco cálido, nunca brillante
        canvas: '#FAF9F7',
        surface: '#FFFFFF',

        // Grises cálidos para texto y bordes
        ink: {
          50: '#F7F6F4',
          100: '#EFEDE9',
          200: '#E2DFD9',
          300: '#CBC6BE',
          400: '#A9A39A',
          500: '#867F77',
          600: '#68625B',
          700: '#4F4A45',
          800: '#3A3630',
          900: '#2B2823',
          950: '#1C1A17',
        },

        // Lavanda pastel · color principal de Demm
        brand: {
          50: '#F7F4FC',
          100: '#EDE7F9',
          200: '#DED4F3',
          300: '#C8B9EA',
          400: '#AE9BDE',
          500: '#9781D0',
          600: '#8069BC',
          700: '#6A559D',
          800: '#57477F',
          900: '#493C68',
        },

        // Pasteles de apoyo (estados, categorías, gráficos)
        mint: { 50: '#F1F9F4', 100: '#E3F2E9', 200: '#CDE8D8', 300: '#B0DCC3', 600: '#2F6B4F' },
        peach: { 50: '#FEF5EF', 100: '#FCE9DD', 200: '#F8D8C4', 300: '#F2C2A5', 600: '#9A5B33' },
        sky: { 50: '#F0F6FC', 100: '#E2EDF8', 200: '#CCDFF2', 300: '#B0CDE9', 600: '#3D6B94' },
        rose: { 50: '#FDF3F5', 100: '#FAE3E8', 200: '#F4CDD6', 300: '#EDB4C1', 600: '#9E4A60' },
        butter: { 50: '#FDF9EE', 100: '#FBF1DA', 200: '#F6E5BC', 300: '#EFD79B', 600: '#8A6B22' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        // Sombras muy suaves: la jerarquía la dan los bordes y el espacio
        soft: '0 1px 2px rgba(43,40,35,0.04)',
        card: '0 1px 3px rgba(43,40,35,0.05)',
        lift: '0 4px 16px rgba(43,40,35,0.07)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
