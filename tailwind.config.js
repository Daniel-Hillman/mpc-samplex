/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        'border-bright': 'var(--color-border-bright)',
        accent: 'var(--color-accent)',
        'accent-dim': 'var(--color-accent-dim)',
        playhead: 'var(--color-playhead)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        warning: 'var(--color-warning)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
        '3xl': 'var(--text-3xl)',
      },
    },
  },
  plugins: [],
};
