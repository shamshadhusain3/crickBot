/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          400: '#34d399',
          500: '#10b981', // emerald green for turf vibe
          600: '#059669',
          900: '#064e3b'
        }
      },
      animation: {
        'coin-flip': 'flip 1.5s ease-in-out',
        'fade-in': 'fade 0.5s ease-out'
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0)' },
          '100%': { transform: 'rotateY(1080deg)' },
        },
        fade: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    },
  },
  plugins: [],
}
