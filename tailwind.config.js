/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F8F4EB', 2: '#F1EADB', 3: '#E8DFCC', card: '#FCFAF5' },
        ink: { DEFAULT: '#5C5146', soft: '#736757' },
        line: '#E2D8C5',
        sage: { DEFAULT: '#83A48A', deep: '#52755A', mist: '#EEF2EA' },
        bark: '#98775F',
        gold: '#D6B65E',
        sun: '#F2B84B',
        berry: '#E07A5F',
        sky: '#9CC9D9',
        danger: '#B07A6E'
      },
      fontFamily: {
        round: ['Huninn', '"LXGW WenKai TC"', 'sans-serif'],
        hand: ['"LXGW WenKai TC"', '"Kaiti TC"', 'STKaiti', 'KaiTi', 'serif'],
        body: ['"Noto Sans TC"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif']
      }
    }
  },
  plugins: []
}
