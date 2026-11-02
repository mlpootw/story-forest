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

/* ---------- 動物圖（以腳底中心為原點，約 26px 寬） ---------- */
export function visitorSvg(id) {
  const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#2F2A25"/><circle cx="${x + 0.4}" cy="${y - 0.5}" r=".45" fill="#fff"/>`
  const blush = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1.1" fill="#E9A3A3" opacity=".7"/>`
  switch (id) {
    case 'rabbit':
      return `<ellipse cx="-4" cy="-24" rx="2.6" ry="7" fill="#F4EEE6"/><ellipse cx="3" cy="-25" rx="2.6" ry="7.5" fill="#F4EEE6"/><ellipse cx="-4" cy="-24" rx="1.2" ry="5" fill="#EBC3C3"/><ellipse cx="3" cy="-25" rx="1.2" ry="5.4" fill="#EBC3C3"/>
        <ellipse cx="0" cy="-6" rx="9" ry="7" fill="#F4EEE6"/><circle cx="0" cy="-15" r="7" fill="#F4EEE6"/>${eye(-2.6, -16)}${eye(2.6, -16)}<circle cx="0" cy="-13" r="1" fill="#D9707A"/>${blush(-4.5, -12.5)}${blush(4.5, -12.5)}<circle cx="9" cy="-5" r="2.6" fill="#fff"/>`
    case 'hedgehog':
      return `<path d="M-12,-2 C-14,-14 -2,-20 6,-16 C12,-13 13,-6 11,-2 Z" fill="#8E6A4F"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${-10 + i * 3},-${10 + (i % 2) * 3} l1.5,-5 1.5,5" fill="#6E5240"/>`).join('')}
        <path d="M6,-12 C12,-11 15,-6 13,-2 L4,-2 Z" fill="#E8D3B6"/>${eye(9, -8)}<circle cx="14" cy="-4" r="1.4" fill="#3E3832"/>${blush(9, -5)}<ellipse cx="-3" cy="-1" rx="10" ry="2" fill="#6E5240" opacity=".3"/>`
    case 'fox':
      return `<path d="M-8,-4 C-18,-6 -20,-16 -14,-18 C-12,-12 -8,-10 -5,-9 Z" fill="#D9824A"/><path d="M-17,-15 C-16,-18 -14,-19 -13,-18 C-14,-16 -15,-15 -17,-15Z" fill="#FFF"/>
        <ellipse cx="0" cy="-6" rx="8" ry="7" fill="#D9824A"/><path d="M-7,-18 L-5,-26 L-1,-19 Z M7,-18 L5,-26 L1,-19 Z" fill="#D9824A"/><path d="M-7,-16 C-7,-22 7,-22 7,-16 L0,-9 Z" fill="#D9824A"/>
        <path d="M-6,-14 C-4,-11 -2,-10 0,-9 C2,-10 4,-11 6,-14 L0,-8 Z" fill="#FFF"/>${eye(-2.8, -15)}${eye(2.8, -15)}<circle cx="0" cy="-9.5" r="1" fill="#3E3832"/><ellipse cx="0" cy="-4" rx="4" ry="4" fill="#F7E8D6"/>`
    case 'bear':
      return `<ellipse cx="0" cy="-6" rx="10" ry="8" fill="#9C7558"/><circle cx="0" cy="-17" r="8" fill="#9C7558"/><circle cx="-6.5" cy="-23" r="3" fill="#9C7558"/><circle cx="6.5" cy="-23" r="3" fill="#9C7558"/><circle cx="-6.5" cy="-23" r="1.5" fill="#C9A688"/><circle cx="6.5" cy="-23" r="1.5" fill="#C9A688"/>
        <ellipse cx="0" cy="-14" rx="3.6" ry="2.8" fill="#D9BFA4"/><circle cx="0" cy="-15" r="1.2" fill="#3E3832"/>${eye(-3, -18.5)}${eye(3, -18.5)}${blush(-5, -14)}${blush(5, -14)}<ellipse cx="0" cy="-5" rx="5" ry="4.5" fill="#C9A688"/>`
    case 'frog':
      return `<ellipse cx="0" cy="-5" rx="10" ry="6.5" fill="#8FB36E"/><circle cx="-5" cy="-11" r="4" fill="#8FB36E"/><circle cx="5" cy="-11" r="4" fill="#8FB36E"/><circle cx="-5" cy="-11.5" r="2.4" fill="#fff"/><circle cx="5" cy="-11.5" r="2.4" fill="#fff"/>
        <circle cx="-5" cy="-11.2" r="1.3" fill="#2F2A25"/><circle cx="5" cy="-11.2" r="1.3" fill="#2F2A25"/><path d="M-4,-5 Q0,-2 4,-5" stroke="#4E6E3E" stroke-width="1" fill="none"/>${blush(-6.5, -6)}${blush(6.5, -6)}<ellipse cx="-9" cy="0" rx="4" ry="1.6" fill="#7AA05C"/><ellipse cx="9" cy="0" rx="4" ry="1.6" fill="#7AA05C"/>`
    case 'deer':
      return `<path d="M-6,0 L-6,-8 M-1,0 L-1,-8 M4,0 L4,-8 M8,0 L8,-8" stroke="#A9805E" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="1" cy="-10" rx="10" ry="5.5" fill="#B88A63"/><circle cx="-4" cy="-11" r="1" fill="#F4EEE6"/><circle cx="3" cy="-12" r="1" fill="#F4EEE6"/><circle cx="6" cy="-9.5" r="1" fill="#F4EEE6"/>
        <path d="M-8,-12 L-10,-20" stroke="#B88A63" stroke-width="4" stroke-linecap="round"/><ellipse cx="-11" cy="-22" rx="4.5" ry="4" fill="#B88A63"/><ellipse cx="-14.5" cy="-21" rx="2.4" ry="2" fill="#D9BFA4"/><path d="M-9,-25 l3,-5 M-12,-26 l-2,-5" stroke="#7E6A4F" stroke-width="1.2" stroke-linecap="round"/>${eye(-11, -23)}<circle cx="-16.4" cy="-21.4" r=".9" fill="#3E3832"/><path d="M-7,-24 l3,-1 -2,3Z" fill="#B88A63"/>`
    default:
      return ''
  }
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
