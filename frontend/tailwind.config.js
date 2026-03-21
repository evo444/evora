/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Primary scale — rich dark, NOT pure black
        primary: {
          50:  '#fafafa',
          100: '#f4f4f4',
          200: '#e4e4e4',
          300: '#c0c0c0',
          400: '#909090',
          500: '#606060',
          600: '#333333',
          700: '#1e1e1e',
          800: '#141414',
          900: '#0d0d0d',   // rich near-black, not pure #000
        },
        // Dark-mode surface palette
        dark: {
          bg:      '#111318',
          surface: '#1a1d24',
          raised:  '#22262f',
          border:  '#2a2e38',
          muted:   '#3a3f4b',
          text:    '#e2e8f0',
          subtext: '#94a3b8',
        },
        // Green accent — matches the reference image's active/highlight colour
        accent: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          DEFAULT: '#22c55e',  // ← primary green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        kerala: {
          green: '#2d9436',
          gold:  '#f0a500',
          red:   '#c0392b',
        }
      },
      animation: {
        'shimmer':    'shimmer 2s linear infinite',
        'float':      'float 3s ease-in-out infinite',
        'slide-up':   'slideUp 0.3s ease-out',
        'fade-in':    'fadeIn 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':       { backgroundPosition: '-200% 0' },
          '100%':     { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%':   { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.6 },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow':       '0 0 20px rgba(34,197,94,0.25)',
        'glow-lg':    '0 0 40px rgba(34,197,94,0.35)',
        'card':       '0 2px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)',
        'card-dark':  '0 2px 20px rgba(0,0,0,0.40)',
        'card-dark-hover': '0 8px 40px rgba(0,0,0,0.60)',
        'green':      '0 4px 20px rgba(34,197,94,0.3)',
      }
    },
  },
  plugins: [],
}
