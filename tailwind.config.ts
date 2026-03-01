import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'elite-red':   '#CC0000',
        'elite-black': '#0A0A0A',
        'elite-white': '#FFFFFF',
      },
      fontFamily: {
        heading: ['var(--font-bebas)',            'Impact', 'sans-serif'],
        label:   ['var(--font-barlow-condensed)', 'sans-serif'],
        body:    ['var(--font-barlow)',            'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'red-sm':    '0 0 12px rgba(204,0,0,0.35)',
        'red-md':    '0 0 24px rgba(204,0,0,0.50)',
        'red-lg':    '0 0 48px rgba(204,0,0,0.60)',
        'red-xl':    '0 0 72px rgba(204,0,0,0.70)',
        'glass':     '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-lg':  '0 16px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeInFast:{ from: { opacity: '0' }, to: { opacity: '1' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        pulseRed:  { '0%,100%': { boxShadow: '0 0 20px rgba(204,0,0,0.4)' }, '50%': { boxShadow: '0 0 44px rgba(204,0,0,0.75)' } },
        spin:      { to: { transform: 'rotate(360deg)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.94)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        fadeIn:     'fadeIn 0.5s ease-out both',
        fadeInFast: 'fadeInFast 0.25s ease-out both',
        slideDown:  'slideDown 0.3s ease-out both',
        slideUp:    'slideUp 0.3s ease-out both',
        pulseRed:   'pulseRed 2.5s ease-in-out infinite',
        shimmer:    'shimmer 2s linear infinite',
        scaleIn:    'scaleIn 0.25s ease-out both',
      },
      transitionTimingFunction: {
        'elite': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
