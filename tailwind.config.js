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
          blue: '#1F4E79',
          'blue-dark': '#153655',
          'blue-light': '#2A69A4',
          'blue-50': '#F0F5FA',
          green: '#27AE60',
          'green-dark': '#219653',
          'green-light': '#48C77F',
          'green-50': '#EAF7EE',
          red: '#E74C3C',
          'red-light': '#FADBD8',
          amber: '#F39C12',
          'amber-light': '#FEF5E7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}
