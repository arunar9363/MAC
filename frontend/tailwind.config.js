/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
  display: ['Nunito', 'sans-serif'],
  body:    ['Nunito', 'sans-serif'],
  mono:    ['"JetBrains Mono"', 'monospace'],
},
      colors: {
        mac: {
          50:  '#eef2ff',
          100: '#dde6ff',
          200: '#c3cffd',
          300: '#9aaefb',
          400: '#6f87f6',
          500: '#4d62ef',
          600: '#3a46e3',
          700: '#3135c8',
          800: '#2b2ea3',
          900: '#272c81',
          950: '#181a4b',
        },
        neuro: {
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
        },
        // Dark mode surface tokens
        dark: {
          950: '#07070e',
          900: '#0d0d18',
          800: '#131320',
          700: '#1a1a2e',
          600: '#22223d',
          500: '#2e2e50',
          400: '#3d3d66',
          300: '#5a5a88',
          200: '#8888bb',
          100: '#c0c0dd',
        },
        // Light mode surface tokens
        light: {
          50:  '#f8f9ff',
          100: '#f0f2ff',
          200: '#e4e8ff',
          300: '#cdd4ff',
          400: '#9aaefb',
          text: '#0f0f1a',
          muted: '#4a4a6a',
          border: '#dde0f0',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(at 30% 20%, rgba(77,98,239,0.18) 0px, transparent 55%), radial-gradient(at 80% 10%, rgba(217,70,239,0.12) 0px, transparent 50%), radial-gradient(at 5% 80%, rgba(49,53,200,0.15) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(200,49,200,0.08) 0px, transparent 45%)',
        'mesh-light': 'radial-gradient(at 30% 20%, rgba(77,98,239,0.08) 0px, transparent 55%), radial-gradient(at 80% 10%, rgba(217,70,239,0.06) 0px, transparent 50%), radial-gradient(at 5% 80%, rgba(49,53,200,0.07) 0px, transparent 50%)',
      },
      animation: {
        'pulse-slow':  'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-xslow': 'pulse 5s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':       'float 6s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'ping-slow':   'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'spin-slow':   'spin 10s linear infinite',
        'node-pulse':  'nodePulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        nodePulse: {
          '0%,100%': { r: '2', opacity: '0.6' },
          '50%':     { r: '4', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-mac':   '0 0 24px rgba(77,98,239,0.35), 0 0 60px rgba(77,98,239,0.12)',
        'glow-neuro': '0 0 24px rgba(217,70,239,0.35), 0 0 60px rgba(217,70,239,0.12)',
        'glow-sm':    '0 0 12px rgba(77,98,239,0.25)',
      },
    },
  },
  plugins: [],
}
