import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /* North Design System Extensions */
      spacing: {
        /* North spacing scale - enables p-north-lg, mb-north-xl, etc. */
        'north-xs': '4px',
        'north-sm': '8px',
        'north-md': '12px',
        'north-base': '16px',
        'north-lg': '24px',
        'north-xl': '32px',
        'north-2xl': '48px',
        /* North 4px grid numeric scale */
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
      },
      fontFamily: {
        ui: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        accent: ['Fraunces', 'Georgia', 'serif'],
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        'page-title': ['22px', { lineHeight: '1.2', letterSpacing: '-0.3px', fontWeight: '600' }],
        'section-header': ['16px', { lineHeight: '1.3', fontWeight: '600' }],
        'issue-title': ['16px', { lineHeight: '1.3', fontWeight: '500' }],
        body: ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        metadata: ['13px', { lineHeight: '1.5', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '20px',
        DEFAULT: '10px',
      },
      boxShadow: {
        'level-1': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'level-2': '0 6px 24px rgba(0, 0, 0, 0.08)',
      },
      transitionDuration: {
        drawer: '250ms',
      },
      transitionTimingFunction: {
        drawer: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      colors: {
        border: 'hsl(var(--border))',
        'border-divider': 'hsl(var(--border-divider))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'surface-subtle': 'hsl(var(--surface-subtle))',
        foreground: 'hsl(var(--foreground))',
        'foreground-secondary': 'hsl(var(--foreground-secondary))',
        'foreground-muted': 'hsl(var(--foreground-muted))',
        'foreground-disabled': 'hsl(var(--foreground-disabled))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          tint: 'hsl(var(--primary-tint))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        status: {
          todo: 'hsl(var(--status-todo))',
          doing: 'hsl(var(--status-doing))',
          'in-review': 'hsl(var(--status-in-review))',
          done: 'hsl(var(--status-done))',
          blocked: 'hsl(var(--status-blocked))',
          'blocked-strong': 'hsl(var(--status-blocked-strong))',
          canceled: 'hsl(var(--status-canceled))',
        },
        progress: {
          critical: 'hsl(var(--progress-critical))',
          low: 'hsl(var(--progress-low))',
          mid: 'hsl(var(--progress-mid))',
          high: 'hsl(var(--progress-high))',
          done: 'hsl(var(--progress-done))',
        },
        bg: {
          done: 'hsl(var(--bg-done))',
          blocked: 'hsl(var(--bg-blocked))',
          review: 'hsl(var(--bg-review))',
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
