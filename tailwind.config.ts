import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  safelist: [
    'theme-future',
    'theme-original',
  ],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // Semantic color system mapped to CSS variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          glow: 'hsl(var(--primary))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        
        // Custom neon palette - preserved for future theme usage
        neon: {
          blue: 'hsl(var(--neon-blue))',
          cyan: 'hsl(var(--neon-cyan))',
          green: 'hsl(var(--neon-green))',
          purple: 'hsl(var(--neon-purple))',
          pink: 'hsl(var(--neon-pink))',
          amber: 'hsl(var(--neon-amber))',
          red: 'hsl(var(--neon-red))',
        },

        // Semantic overlays
        overlay: 'hsl(var(--overlay))',
        'overlay-light': 'hsl(var(--overlay-light))',

        // Surface
        'surface-elevated': 'hsl(var(--surface-elevated))',

        // Borders
        'border-subtle': 'hsl(var(--border-subtle))',

        // Status colors
        'status-success': 'hsl(var(--status-success))',
        'status-success-muted': 'hsl(var(--status-success-muted))',
        'status-warning': 'hsl(var(--status-warning))',
        'status-warning-muted': 'hsl(var(--status-warning-muted))',
        'status-error': 'hsl(var(--status-error))',
        'status-error-muted': 'hsl(var(--status-error-muted))',
        'status-info': 'hsl(var(--status-info))',
        'status-info-muted': 'hsl(var(--status-info-muted))',

        // Action type colors
        'action-email': 'hsl(var(--action-email))',
        'action-email-muted': 'hsl(var(--action-email-muted))',
        'action-pr': 'hsl(var(--action-pr))',
        'action-pr-muted': 'hsl(var(--action-pr-muted))',
        'action-meeting': 'hsl(var(--action-meeting))',
        'action-meeting-muted': 'hsl(var(--action-meeting-muted))',

        // Section colors for brief sections
        'section-focus': 'hsl(var(--section-focus))',
        'section-focus-muted': 'hsl(var(--section-focus-muted))',
        'section-meetings': 'hsl(var(--section-meetings))',
        'section-meetings-muted': 'hsl(var(--section-meetings-muted))',
        'section-review': 'hsl(var(--section-review))',
        'section-review-muted': 'hsl(var(--section-review-muted))',
        'section-prs': 'hsl(var(--section-prs))',
        'section-prs-muted': 'hsl(var(--section-prs-muted))',
        'section-email': 'hsl(var(--section-email))',
        'section-email-muted': 'hsl(var(--section-email-muted))',
        'section-tasks': 'hsl(var(--section-tasks))',
        'section-tasks-muted': 'hsl(var(--section-tasks-muted))',
        'section-alerts': 'hsl(var(--section-alerts))',
        'section-alerts-muted': 'hsl(var(--section-alerts-muted))',
        'section-notes': 'hsl(var(--section-notes))',
        'section-notes-muted': 'hsl(var(--section-notes-muted))',
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
