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
      /* Clean & Vibrant Design System Extensions */
      fontFamily: {
        ui: ['Inter Variable', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Inter Variable', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        /* Legacy alias — `font-accent` markup now renders in Inter (no serif).
           Kept valid so existing headings keep working; remove in a later polish pass. */
        accent: ['Inter Variable', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        /* Clean & Vibrant type scale */
        display: ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '650' }],
        title: ['17px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        section: ['13px', { lineHeight: '18px', letterSpacing: '0.02em', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '450' }],
        'body-sm': ['13.5px', { lineHeight: '20px', fontWeight: '450' }],
        meta: ['12.5px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        micro: ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '600' }],
        /* Legacy aliases — keep existing markup working during phased rollout */
        'page-title': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '650' }],
        'section-header': ['17px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'issue-title': ['15px', { lineHeight: '22px', fontWeight: '450' }],
        metadata: ['12.5px', { lineHeight: '16px', fontWeight: '500' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        DEFAULT: '8px',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        /* Legacy aliases */
        'level-1': 'var(--shadow-xs)',
        'level-2': 'var(--shadow-lg)',
      },
      transitionDuration: {
        drawer: '250ms',
      },
      transitionTimingFunction: {
        drawer: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      colors: {
        border: 'hsl(var(--border))',
        'border-subtle': 'hsl(var(--border-subtle))',
        'border-strong': 'hsl(var(--border-strong))',
        'border-divider': 'hsl(var(--border-divider))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'surface-subtle': 'hsl(var(--surface-subtle))',
        'surface-sunken': 'hsl(var(--surface-sunken))',
        foreground: 'hsl(var(--foreground))',
        'foreground-secondary': 'hsl(var(--foreground-secondary))',
        'foreground-muted': 'hsl(var(--foreground-muted))',
        'foreground-disabled': 'hsl(var(--foreground-disabled))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          active: 'hsl(var(--primary-active))',
          tint: 'hsl(var(--primary-tint))',
          'tint-strong': 'hsl(var(--primary-tint-strong))',
        },
        priority: {
          p1: 'hsl(var(--priority-p1))',
          p2: 'hsl(var(--priority-p2))',
          p3: 'hsl(var(--priority-p3))',
          p4: 'hsl(var(--priority-p4))',
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
