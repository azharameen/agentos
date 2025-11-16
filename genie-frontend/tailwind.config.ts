import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5A8BFA",
        background: "#F8F8F8",
        "background-light": "#FFFFFF",
        "background-dark": "#F0F2F5",
        "text-main": "#334155",
        "text-light": "#64748B",
        "border-light": "#E2E8F0",
        success: "#28A745",
        warning: "#DBAB09",
        error: "#D73A49",
        "muted-blue-100": "#E0ECFF",
        "muted-blue-500": "#5A8BFA",
        "soft-cream": "#FDFBF7",
      },
      fontFamily: {
        display: "Nunito Sans"
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "1rem",
        xl: "1.5rem",
        full: "9999px"
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      boxShadow: {
        'primary-glow': '0 0 15px 0 hsl(var(--primary) / 0.5)',
        'primary-glow-strong': '0 0 25px 0 hsl(var(--primary) / 0.7)',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
