import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-rajdhani)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Semantic color system for "Work Intel Mission Control"
        background: 'hsl(222, 47%, 4%)', // #030712
        foreground: 'hsl(210, 40%, 98%)', // #f8fafc
        
        card: {
          DEFAULT: 'hsl(222, 47%, 7%)', // Slightly lighter than bg
          foreground: 'hsl(210, 40%, 98%)',
        },
        popover: {
          DEFAULT: 'hsl(222, 47%, 6%)',
          foreground: 'hsl(210, 40%, 98%)',
        },
        primary: {
          DEFAULT: 'hsl(189, 94%, 43%)', // Cyan-500 #06b6d4
          foreground: 'hsl(222, 47%, 4%)',
          glow: 'hsl(189, 94%, 43%)',
        },
        secondary: {
          DEFAULT: 'hsl(226, 71%, 40%)', // Indigo-600 #4f46e5
          foreground: 'hsl(210, 40%, 98%)',
        },
        muted: {
          DEFAULT: 'hsl(217, 33%, 17%)', // Slate-800
          foreground: 'hsl(215, 20%, 65%)', // Slate-400
        },
        accent: {
          DEFAULT: 'hsl(189, 94%, 43%)',
          foreground: 'hsl(222, 47%, 4%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 84%, 60%)', // Red-500
          foreground: 'hsl(210, 40%, 98%)',
        },
        border: 'hsl(217, 33%, 17%)',
        input: 'hsl(217, 33%, 17%)',
        ring: 'hsl(189, 94%, 43%)',
        
        // Custom neon palette
        neon: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          green: '#10b981',
          purple: '#8b5cf6',
          pink: '#ec4899',
          amber: '#f59e0b',
          red: '#ef4444',
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px -2px var(--glow-color, rgba(6, 182, 212, 0.3))',
        'glow-md': '0 0 20px -4px var(--glow-color, rgba(6, 182, 212, 0.4))',
        'glow-lg': '0 0 30px -6px var(--glow-color, rgba(6, 182, 212, 0.5))',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px var(--glow-color)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 20px var(--glow-color)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scan-line 3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
