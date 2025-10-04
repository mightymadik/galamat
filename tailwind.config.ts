import type { Config } from "tailwindcss";
const { heroui } = require("@heroui/react");

const flexClasses = {
  ".flex-jsb-c": {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ".flex-jsb-s": {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
  },
  ".flex-jsb-e": {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
  },
  ".flex-js-c": {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  ".flex-js-s": {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "start",
  },
  ".flex-js-e": {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "end",
  },
  ".flex-jc-c": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  ".flex-jc-e": {
    display: "flex",
    justifyContent: "center",
    alignItems: "end",
  },
  ".flex-jc-s": {
    display: "flex",
    justifyContent: "center",
    alignItems: "start",
  },
  ".flex-jse-c": {
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  ".flex-jsa-c": {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
  },
  ".flex-je-c": {
    display: "flex",
    justifyContent: "end",
    alignItems: "center",
  },
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        white: "#FFF",
        black: "#11181C",
        blue: "#132C5E",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
      borderColor: {
        DEFAULT: "#b2b2b2",
      },
      outlineColor: {
        DEFAULT: "#b2b2b2",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        pop: "pop 0.4s ease-in-out",
      },
    },
  },
  plugins: [
    function ({ addComponents }: { addComponents: any }) {
      addComponents(flexClasses);
    },
    heroui({
      addCommonColors: true,
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#132C5E",
              foreground: "#F8F2EA",
            },
          },
        },
      },
    }),
  ],
} satisfies Config;
