import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: { ink: '#111111', canvas: '#FFFFFF', surface: '#FAFAFA', sand: '#E9E7E2' },
      fontFamily: { sans: ['Manrope', 'Arial', 'Helvetica', 'sans-serif'] },
      letterSpacing: { editorial: '-.065em' },
    },
  },
  plugins: [],
} satisfies Config;
