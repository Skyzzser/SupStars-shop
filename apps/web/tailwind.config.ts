import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-bg)",
          surface: "var(--tg-surface)",
          text: "var(--tg-text)",
          hint: "var(--tg-hint)",
          link: "var(--tg-link)",
          button: "var(--tg-button)",
          buttonText: "var(--tg-button-text)",
          border: "var(--tg-border)"
        }
      },
      boxShadow: {
        panel: "0 16px 40px rgba(0, 0, 0, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
