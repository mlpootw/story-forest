/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F8F4EB', 2: '#F1EADB', 3: '#E8DFCC', card: '#FCFAF5' },
        ink: { DEFAULT: '#5C5146', soft: '#8A7E70' },
        line: '#E2D8C5',
        sage: { DEFAULT: '#83A48A', deep: '#5F8468', mist: '#EEF2EA' },
        bark: '#98775F',
        gold: '#D6B65E',
        danger: '#B07A6E'
      },
      fontFamily: {
        hand: ['"LXGW WenKai TC"', '"Kaiti TC"', 'STKaiti', 'KaiTi', 'serif'],
        body: ['"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif']
      }
    }
  },
  plugins: []
}
