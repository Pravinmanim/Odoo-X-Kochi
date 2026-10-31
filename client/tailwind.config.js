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
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        status: {
          draft: '#6b7280',     // grey
          quotation: '#3b82f6', // blue
          confirmed: '#f59e0b', // amber
          active: '#10b981',    // green
          closed: '#ef4444',    // red
          paid: '#10b981',      // green
          overdue: '#ef4444',   // red
        }
      }
    },
  },
  plugins: [],
}

