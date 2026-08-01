/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo crema de marca y superficie apenas más clara para las tarjetas
        canvas: '#FCF5E8',
        surface: '#FFFCF5',

        /**
         * Escala neutra cálida.
         * ink-500 es el tono suave de marca (#8A6865)
         * ink-800 es el tono fuerte de marca (#4A1E1A)
         */
        ink: {
          50: '#FAF3E6',
          100: '#F3E9D9',
          200: '#E7D8C4',
          300: '#D2BCAB',
          400: '#B29B93',
          500: '#8A6865',
          600: '#734F4B',
          700: '#5D3B36',
          800: '#4A1E1A',
          900: '#3B1613',
          950: '#2A0F0D',
        },

        /**
         * Color principal.
         * brand-500 = suave (#8A6865) · brand-800 = fuerte (#4A1E1A)
         */
        brand: {
          50: '#FBF1EC',
          100: '#F6E3DB',
          200: '#EDCDC1',
          300: '#DFB0A1',
          400: '#C58E7E',
          500: '#8A6865',
          600: '#6E4B46',
          700: '#5A322C',
          800: '#4A1E1A',
          900: '#3A1512',
        },

        // Acentos terrosos, armónicos con el crema.
        // Se mantienen los nombres para no tocar los componentes.
        mint: { 50: '#F1F5EC', 100: '#E3EBDB', 200: '#CDDCC0', 300: '#B4C9A4', 600: '#4C6B41' },
        butter: { 50: '#FBF5E4', 100: '#F6EACB', 200: '#EEDAA6', 300: '#E2C87F', 600: '#7A5C18' },
        sky: { 50: '#EEF2F5', 100: '#DEE7ED', 200: '#C4D3DE', 300: '#A6BDCD', 600: '#425F72' },
        rose: { 50: '#FBEEE8', 100: '#F6DDD1', 200: '#EDC2AE', 300: '#E0A188', 600: '#9C4A2C' },
        peach: { 50: '#FAF3E9', 100: '#F3E7D5', 200: '#E8D5BA', 300: '#DBBF9A', 600: '#8A6A3E' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(74,30,26,0.05)',
        card: '0 1px 3px rgba(74,30,26,0.06)',
        lift: '0 4px 16px rgba(74,30,26,0.09)',
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
