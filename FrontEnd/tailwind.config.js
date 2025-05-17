/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-orange': '#ff7b54',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scale: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        spin: {
          'to': { transform: 'rotate(360deg)' }
        },
        scaleUp: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'blink': 'blink 1s step-start infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'slideUp': 'slideUp 0.3s ease-out',
        'scale': 'scale 0.2s ease-in-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
        'scaleUp': 'scaleUp 0.2s ease-out',
      },
      transitionProperty: {
        'all': 'all',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}