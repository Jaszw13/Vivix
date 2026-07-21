/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 使用 CSS 變數實現雙主題
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          soft: "var(--accent-soft)",
        },
        auxiliary: "var(--auxiliary)",
        data: "var(--data-color)",
        border: "var(--border-color)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        button: "var(--radius-button)",
      },
      fontFamily: {
        display: "var(--font-display)",
        mono: ['"JetBrains Mono"', "monospace"],
        body: ['"Noto Sans TC"', "sans-serif"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        button: "var(--shadow-button)",
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "0.9", letterSpacing: "-0.02em" }],
        "display-lg": ["3rem", { lineHeight: "0.95", letterSpacing: "-0.01em" }],
        "display-md": ["2rem", { lineHeight: "1", letterSpacing: "-0.01em" }],
      },
    },
  },
  plugins: [],
};
