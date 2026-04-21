/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        eventoDominio: '#FF9800',
        comando: '#2196F3',
        agregado: '#FFC107',
        politica: '#9C27B0',
        modeloLectura: '#4CAF50',
        sistemaExterno: '#E91E63',
        hotspot: '#F44336',
        actor: '#FFEB3B'
      }
    }
  },
  plugins: []
}
