import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // DeBuggAI Design System Colors
        bg: '#0A0D0A',
        surface: '#111411',
        surface2: '#171C17',
        surface3: '#1E261E',
        border: '#1F2B1F',
        border2: '#283228',
        green: {
          DEFAULT: '#00C853',
          bright: '#00E676',
          dim: '#00A344',
          muted: 'rgba(0,200,83,0.12)',
          glow: 'rgba(0,200,83,0.08)',
        },
        text: {
          DEFAULT: '#E8F5E9',
          2: '#8BAD8B',
          3: '#4D6B4D',
          4: '#2E3E2E',
        },
        red: '#FF5252',
        amber: '#FFAB00',
        blue: '#40C4FF',
        purple: '#CE93D8',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display': ['40px', { lineHeight: '1.1', letterSpacing: '-0.5px', fontWeight: '600' }],
        'h1': ['28px', { lineHeight: '1.2', letterSpacing: '-0.3px', fontWeight: '600' }],
        'h2': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'mono-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'mono-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'stat': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      borderRadius: {
        'ds': '6px',
        'ds-sm': '6px',
        'ds-md': '6px',
        'ds-lg': '6px',
        'ds-xl': '6px',
        'ds-pill': '9999px',
      },
      spacing: {
        'ds-section': '48px',
      },
      boxShadow: {
        'ds-focus': '0 0 0 2px rgba(0,200,83,0.2)',
        'ds-focus-error': '0 0 0 2px rgba(255,82,82,0.2)',
        'ds-card': 'none',
      },
    },
  },
  plugins: [],
};

export default config;
