/**
 * Los tonos de marca (canvas, ink y brand) salen de variables CSS para que se
 * puedan cambiar desde la sección Marca sin recompilar. Se guardan como
 * tripletes RGB para que sigan funcionando las opacidades (ej. `bg-ink-900/25`).
 * Los valores por defecto están en src/index.css y la escala se genera en
 * src/lib/theme.ts.
 *
 * @type {import('tailwindcss').Config}
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('--c-canvas'),
        surface: v('--c-surface'),

        ink: {
          50: v('--c-ink-50'),
          100: v('--c-ink-100'),
          200: v('--c-ink-200'),
          300: v('--c-ink-300'),
          400: v('--c-ink-400'),
          500: v('--c-ink-500'),
          600: v('--c-ink-600'),
          700: v('--c-ink-700'),
          800: v('--c-ink-800'),
          900: v('--c-ink-900'),
          950: v('--c-ink-950'),
        },

        brand: {
          50: v('--c-brand-50'),
          100: v('--c-brand-100'),
          200: v('--c-brand-200'),
          300: v('--c-brand-300'),
          400: v('--c-brand-400'),
          500: v('--c-brand-500'),
          600: v('--c-brand-600'),
          700: v('--c-brand-700'),
          800: v('--c-brand-800'),
          900: v('--c-brand-900'),
        },

        // Acentos semánticos: no dependen de la marca.
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
        soft: '0 1px 2px rgb(var(--c-ink-900) / 0.05)',
        card: '0 1px 3px rgb(var(--c-ink-900) / 0.06)',
        lift: '0 4px 16px rgb(var(--c-ink-900) / 0.09)',
      },
      /*
       * Esquinas más cerradas, como las de Buffer.
       *
       * La app tenía todo bastante redondeado, que para una tarjeta grande
       * queda bien pero en una lista de renglones los separa de más: con el
       * radio chico, veinte piezas seguidas se leen como una lista y no como
       * veinte cajitas.
       */
      borderRadius: {
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.875rem',
        '3xl': '1.125rem',
      },
    },
  },
  plugins: [],
}
