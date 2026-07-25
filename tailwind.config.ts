import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Blue
        primary: '#0C5CF0',
        'primary-container': '#043BA9',
        'on-primary': '#ffffff',
        'on-primary-container': '#ffffff',
        'inverse-primary': '#ECEEEF',
        'primary-fixed': '#E8EFFD',
        'primary-fixed-dim': '#ECEEEF',
        'on-primary-fixed': '#043BA9',
        'on-primary-fixed-variant': '#0C5CF0',

        // CTA Red
        secondary: '#C50000',
        'secondary-container': '#E90809',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#ffffff',
        'secondary-fixed': '#FFEBEE',
        'secondary-fixed-dim': '#FF3535',
        'on-secondary-fixed': '#C50000',
        'on-secondary-fixed-variant': '#E90809',

        // Deep Navy
        tertiary: '#1D2235',
        'tertiary-container': '#1D2235',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#8C929D',
        'tertiary-fixed': '#E8EAED',
        'tertiary-fixed-dim': '#8C929D',
        'on-tertiary-fixed': '#1D2235',
        'on-tertiary-fixed-variant': '#43474F',

        // Surfaces
        surface: '#F6F8FB',
        background: '#F6F8FB',
        'on-surface': '#1D2235',
        'on-background': '#1D2235',
        'surface-variant': '#ECEEEF',
        'on-surface-variant': '#8C929D',
        'surface-container': '#ECEEEF',
        'surface-container-low': '#F8F9FC',
        'surface-container-high': '#D7DCE5',
        'surface-container-highest': '#D7DCE5',
        'surface-container-lowest': '#ffffff',
        'surface-dim': '#D7DCE5',
        'surface-bright': '#ffffff',
        'surface-tint': '#0C5CF0',

        // Structural
        outline: '#8C929D',
        'outline-variant': '#D7DCE5',
        'inverse-surface': '#1D2235',
        'inverse-on-surface': '#F6F8FB',

        // Error
        error: '#E90809',
        'on-error': '#ffffff',
        'error-container': '#FFEBEE',
        'on-error-container': '#C50000',
      },
      borderRadius: {
        DEFAULT: '0.625rem',   // 10px — inputs
        sm: '0.25rem',
        lg: '0.75rem',         // 12px — buttons
        xl: '1.25rem',         // 20px — cards
        full: '9999px',        // badges
      },
      spacing: {
        unit: '8px',
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '32px',
        xl: '64px',
        xxl: '120px',
        gutter: '32px',
        'container-max': '1280px',
      },
      fontFamily: {
        h1: ['var(--font-montserrat)', 'sans-serif'],
        'h1-mobile': ['var(--font-montserrat)', 'sans-serif'],
        h2: ['var(--font-montserrat)', 'sans-serif'],
        'h2-mobile': ['var(--font-montserrat)', 'sans-serif'],
        h3: ['var(--font-montserrat)', 'sans-serif'],
        button: ['var(--font-montserrat)', 'sans-serif'],
        number: ['var(--font-montserrat)', 'sans-serif'],
        'body-md': ['var(--font-inter)', 'sans-serif'],
        'body-lg': ['var(--font-inter)', 'sans-serif'],
        'label-bold': ['var(--font-inter)', 'sans-serif'],
        caption: ['var(--font-inter)', 'sans-serif'],
      },
      fontSize: {
        h1: ['40px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '800' }],
        'h1-mobile': ['32px', { lineHeight: '1.2', fontWeight: '800' }],
        h2: ['32px', { lineHeight: '1.3', fontWeight: '800' }],
        'h2-mobile': ['24px', { lineHeight: '1.3', fontWeight: '800' }],
        h3: ['24px', { lineHeight: '1.4', fontWeight: '700' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-bold': ['14px', { lineHeight: '1.4', fontWeight: '500' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      maxWidth: {
        'container-max': '1280px',
      },
      boxShadow: {
        card: '0 15px 40px rgba(0,0,0,.12)',
        'card-hover': '0 25px 60px rgba(0,0,0,.18)',
        btn: '0 8px 20px rgba(12,92,240,.35)',
      },
    },
  },
  plugins: [],
}

export default config
