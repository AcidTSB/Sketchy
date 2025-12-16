/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* Apple-Inspired Spacing Scale */
      spacing: {
        'apple-1': '3px',
        'apple-2': '6px',
        'apple-3': '8px',
        'apple-4': '10px',
        'apple-5': '13px',
        'apple-6': '16px',
        'apple-7': '20px',
        'apple-8': '24px',
        'apple-9': '32px',
        'apple-10': '40px',
        gutter: 'var(--bodyGutter)',
      },
      /* Apple-Inspired Border Radius */
      borderRadius: {
        'apple-sm': '8px',
        apple: '12px',
        'apple-md': '16px',
        'apple-lg': '20px',
        'apple-xl': '24px',
        'apple-2xl': '32px',
      },
      /* Apple-Inspired Blur */
      backdropBlur: {
        apple: '20px',
        'apple-heavy': '40px',
      },
      /* Apple-Inspired Shadows */
      boxShadow: {
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        apple: '0 4px 12px rgba(0, 0, 0, 0.08)',
        'apple-md': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'apple-lg': '0 16px 48px rgba(0, 0, 0, 0.16)',
        'apple-dark': '0 4px 16px rgba(0, 0, 0, 0.3)',
        'apple-dark-lg': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      /* Apple-Inspired Font Sizes */
      fontSize: {
        'apple-xs': ['11px', { lineHeight: '1.36' }],
        'apple-sm': ['13px', { lineHeight: '1.38' }],
        'apple-base': ['15px', { lineHeight: '1.47' }],
        'apple-lg': ['17px', { lineHeight: '1.47' }],
        'apple-xl': ['20px', { lineHeight: '1.25' }],
        'apple-2xl': ['22px', { lineHeight: '1.2' }],
        'apple-3xl': ['28px', { lineHeight: '1.15' }],
        'apple-4xl': ['34px', { lineHeight: '1.1' }],
      },
      /* Apple-Inspired Transitions */
      transitionDuration: {
        'apple-fast': '150ms',
        apple: '210ms',
        'apple-slow': '300ms',
      },
      transitionTimingFunction: {
        apple: 'ease-out',
        'apple-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      /* Animation */
      animation: {
        'fade-in': 'fadeIn 210ms ease-out',
        'scale-in': 'scaleIn 210ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
