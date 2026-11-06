import { art } from './art'
// 英文書森林訪客：每本英文書帶來一位小動物，牠會教一個英文單字

export const VISITORS = [
  { id: 'rabbit', zh: '小兔子', en: 'Rabbit' },
  { id: 'hedgehog', zh: '小刺蝟', en: 'Hedgehog' },
  { id: 'fox', zh: '小狐狸', en: 'Fox' },
  { id: 'bear', zh: '小熊', en: 'Bear' },
  { id: 'frog', zh: '小青蛙', en: 'Frog' },
  { id: 'deer', zh: '小鹿', en: 'Deer' }
]

// 判斷是不是英文書：家長手動標記優先，其次看書籍語言，最後看書名是不是英文字母
export function isEnglishBook(cb, book) {
  if (cb?.is_english === true) return true
  if (cb?.is_english === false) return false
  const lang = (book?.language || '').toLowerCase()
  if (lang) return lang === 'en' || lang.startsWith('en-') || lang === 'eng'
  const t = (book?.title || '').trim()
  return t.length > 0 && /^[\x20-\x7E’‘“”—–]+$/.test(t) && /[A-Za-z]{2}/.test(t)
}

/* ---------- 單字：依當月的樹與季節 ---------- */
const TREE_WORDS = {
  guava: [['Guava', '芭樂', '🍈'], ['Green', '綠色', '💚'], ['Round', '圓圓的', '⚪']],
  mango: [['Mango', '芒果', '🥭'], ['Yellow', '黃色', '💛'], ['Sweet', '甜甜的', '🍯']],
  pomelo: [['Pomelo', '柚子', '🍈'], ['Moon', '月亮', '🌕'], ['Big', '大大的', '🐘']],
  waxapple: [['Wax apple', '蓮霧', '🔔'], ['Red', '紅色', '❤️'], ['Bell', '鈴鐺', '🔔']],
  sakura: [['Flower', '花', '🌸'], ['Pink', '粉紅色', '🩷'], ['Spring', '春天', '🌱']],
  banana: [['Banana', '香蕉', '🍌'], ['Long', '長長的', '📏'], ['Monkey', '猴子', '🐒']]
}
const MONTH_WORDS = {
  1: [['Bird', '小鳥', '🐦'], ['Cold', '冷', '🥶']],
  2: [['Bird', '小鳥', '🐦'], ['Flower', '花', '🌸']],
  3: [['Butterfly', '蝴蝶', '🦋'], ['Spring', '春天', '🌱']],
  4: [['Butterfly', '蝴蝶', '🦋'], ['White', '白色', '🤍']],
  5: [['Firefly', '螢火蟲', '✨'], ['Night', '晚上', '🌙']],
  6: [['Snail', '蝸牛', '🐌'], ['Rain', '下雨', '🌧️']],
  7: [['Summer', '夏天', '☀️'], ['Hot', '熱', '🥵']],
  8: [['Dragonfly', '蜻蜓', '🪽'], ['Sun', '太陽', '☀️']],
  9: [['Yellow', '黃色', '💛'], ['Wind', '風', '🍃']],
  10: [['Squirrel', '松鼠', '🐿️'], ['Nut', '堅果', '🌰']],
  11: [['Sparrow', '麻雀', '🐦'], ['Autumn', '秋天', '🍂']],
  12: [['Winter', '冬天', '❄️'], ['Red', '紅色', '❤️']]
}
const BASIC = [['Tree', '樹', '🌳'], ['Leaf', '葉子', '🍃'], ['Book', '書', '📖'], ['Sky', '天空', '☁️']]

export function wordsFor(speciesId, ym) {
  const month = Number(ym.slice(5, 7))
  return [...(TREE_WORDS[speciesId] || []), ...(MONTH_WORDS[month] || []), ...BASIC].map(([en, zh, emoji]) => ({ en, zh, emoji }))
}

export function speak(text) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return false
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.8
    u.pitch = 1.1
    const v = synth.getVoices().find((x) => /^en(-|_)US/i.test(x.lang)) || synth.getVoices().find((x) => /^en/i.test(x.lang))
    if (v) u.voice = v
    synth.speak(u)
    return true
  } catch {
    return false
  }
}

/* ---------- 動物圖（以腳底中心為原點）：繪本風插圖 ---------- */
const VISITOR_IDS = ['rabbit', 'hedgehog', 'fox', 'bear', 'frog', 'deer']
export function visitorSvg(id) {
  if (!VISITOR_IDS.includes(id)) return ''
  return `<image href="${art(id)}" x="-29" y="-64" width="58" height="66" preserveAspectRatio="xMidYMax meet"/>`
}

// 依這個月已長出的英文書葉子，安排訪客（同一個月內動物與單字盡量不重複）
export function buildVisitors(leaves, childId, ym, speciesId, hash) {
  const words = wordsFor(speciesId, ym)
  const base = hash(childId + ym)
  return leaves
    .filter((l) => l.en)
    .sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : a.id < b.id ? -1 : 1))
    .slice(0, 6)
    .map((l, i) => ({
      id: l.id,
      leaf: l,
      animal: VISITORS[(base + i) % VISITORS.length].id,
      info: VISITORS[(base + i) % VISITORS.length],
      word: words[(base + i * 3) % words.length]
    }))
}
