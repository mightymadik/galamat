import {heroui} from '@heroui/theme';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx,scss}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx,,scss}",
    "./node_modules/@nextui-org/theme/dist/components/(button|link|navbar|slider|tabs|popover|ripple|spinner).js",
    "./node_modules/@heroui/theme/dist/components/(input|select|slider|form|listbox|divider|popover|button|ripple|spinner|scroll-shadow).js"
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1025px', // твой кастомный lg
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: "#180161",
        accent: "#F5F5F5",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out forwards',
        fadeInFast: 'fadeIn 0.3s ease-in-out forwards',
        fadeOut: 'fadeOut 0.2s ease-in-out forwards',
      },
    },
  },
  plugins: [heroui()],
};

export default config;
