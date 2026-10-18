/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#176B3A',     // Primary dark green
          fresh: '#2E8B57',    // Fresh green
          light: '#F7FAF5',    // Light background
          hover: '#135830',    // Slightly deeper dark green for hover states
          surface: '#FFFFFF',  // White cards
          charcoal: '#1E2922', // Dark charcoal text
          muted: '#526659',    // Secondary text
          border: '#E2EBE2',   // Subtle border
          accent: '#FFB800',   // Warm accent (spice/gold) for badges/stars
          soft: '#EBF4EC',     // Soft tinted green background for badges & chips
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(23, 107, 58, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 30px -4px rgba(23, 107, 58, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'modal': '0 20px 40px -8px rgba(15, 30, 20, 0.25)',
      }
    },
  },
  plugins: [],
}
