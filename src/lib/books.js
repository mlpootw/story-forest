// 書籍相關：分類、ISBN、外部查詢、自動分類建議、日期工具
import { supabase } from './supabase'

/* ---------- 八大分類（id 與資料庫 book_categories 一致） ---------- */
export const CATEGORIES = [
  { id: 'emotion', name: '情緒與自我認識', color: '#C88F99',
    zh: ['情緒', '生氣', '害怕', '膽小', '哭', '心情', '勇敢', '難過', '傷心', '自信', '脾氣', '開心', '快樂', '嫉妒', '孤單', '寂寞', '做自己', '感覺', '愛', '抱抱', '擔心', '緊張', '不一樣', '我是', '我的', '喜歡自己', '分離', '想念', '媽媽', '爸爸', '怕'],
    en: ['emotion', 'feeling', 'self-esteem', 'self-perception', 'fear', 'anger', 'love', 'happiness', 'sadness', 'self'] },
  { id: 'social', name: '人際與社交', color: '#D5A57C',
    zh: ['朋友', '友誼', '好朋友', '分享', '一起', '合作', '幫忙', '幫助', '輪流', '等待', '鄰居', '禮貌', '吵架', '道歉', '家人', '家庭', '兄弟', '姊妹', '姐姐', '哥哥', '弟弟', '妹妹', '同學', '上學', '幼兒園', '學校', '老師', '派對', '生日', '大家', '客人', '飯店', '旅館', '拜訪'],
    en: ['friendship', 'social', 'sharing', 'manners', 'sibling', 'family', 'school', 'kindness', 'cooperation', 'neighbor'] },
  { id: 'nature', name: '自然與科學', color: '#83A48A',
    zh: ['動物', '植物', '昆蟲', '雨', '樹', '森林', '葉子', '花', '草', '種子', '發芽', '蝸牛', '螢火蟲', '蝴蝶', '毛毛蟲', '蜜蜂', '螞蟻', '鳥', '鴨', '鵝', '熊', '兔', '狐狸', '刺蝟', '松鼠', '老鼠', '貓', '狗', '豬', '牛', '羊', '馬', '雞', '魚', '鯨', '海', '河', '湖', '青蛙', '烏龜', '恐龍', '大象', '獅子', '老虎', '猴', '企鵝', '科學', '天氣', '季節', '春', '夏', '秋', '冬', '雪', '風', '雲', '星星', '月亮', '太陽', '宇宙', '太空', '地球', '身體', '水'],
    en: ['animal', 'nature', 'science', 'insect', 'dinosaur', 'plant', 'weather', 'season', 'ocean', 'space', 'bird', 'bear', 'rabbit', 'fox', 'cat', 'dog', 'pig', 'fish', 'frog', 'tree', 'earth'] },
  { id: 'vehicle', name: '交通與機械', color: '#D6B65E',
    zh: ['汽車', '車子', '火車', '電車', '高鐵', '捷運', '公車', '巴士', '挖土機', '怪手', '工程車', '吊車', '卡車', '消防車', '救護車', '警車', '垃圾車', '飛機', '直升機', '船', '潛水艇', '火箭', '機器', '機器人', '機械', '工地', '引擎', '腳踏車', '摩托車', '交通', '紅綠燈', '馬路', '車'],
    en: ['transportation', 'vehicle', 'truck', 'train', 'car', 'machine', 'construction', 'airplane', 'boat', 'rocket', 'robot', 'bus', 'tractor'] },
  { id: 'life', name: '生活與習慣', color: '#A5B6A0',
    zh: ['刷牙', '牙齒', '睡覺', '睡前', '晚安', '睡不著', '吃飯', '挑食', '蔬菜', '食物', '洗澡', '洗手', '上廁所', '尿布', '便便', '尿尿', '習慣', '起床', '早安', '收拾', '整理', '穿衣', '衣服', '鞋子', '生病', '看醫生', '打針', '安全', '過馬路', '購物', '買菜', '煮飯', '廚房', '做菜', '一天', '自己來', '牙醫', '醫生', '買東西', '上街', '跑腿', '第一次', '長大'],
    en: ['bedtime', 'goodnight', 'good night', 'daily living', 'health', 'toilet', 'hygiene', 'daily activities', 'safety', 'food', 'sleep', 'manners'] },
  { id: 'imagination', name: '想像與創造', color: '#AD9DBD',
    zh: ['想像', '魔法', '魔術', '奇幻', '冒險', '夢', '怪獸', '怪物', '巫婆', '女巫', '公主', '王子', '國王', '童話', '仙子', '精靈', '龍', '發明', '畫畫', '畫', '顏料', '創作', '神奇', '飛', '寶藏', '海盜', '城堡', '外星人', '秘密', '如果'],
    en: ['imagination', 'fantasy', 'magic', 'fairy tale', 'monster', 'adventure', 'art', 'dragon', 'pirate', 'princess', 'dream'] },
  { id: 'cognition', name: '認知與思考', color: '#8EAEBB',
    zh: ['數數', '數一數', '數字', '算數', '形狀', '顏色', '大小', '分類', '比較', '認識', '字母', '注音', 'ABC', '躲貓貓', '找一找', '在哪裡', '時間', '時鐘', '左右', '上下', '相反', '問題', '為什麼', '怎麼', '思考', '謎', '迷宮', '拼圖', '幾個', '一二三'],
    en: ['concept', 'counting', 'number', 'color', 'shape', 'alphabet', 'opposite', 'size', 'time', 'puzzle', 'abc'] },
  { id: 'culture', name: '文化與世界', color: '#BE9582',
    zh: ['外婆', '外公', '阿嬤', '阿公', '奶奶', '爺爺', '節日', '過年', '新年', '春節', '年獸', '紅包', '中秋', '端午', '粽子', '元宵', '燈籠', '聖誕', '萬聖', '傳統', '世界', '各地', '台灣', '臺灣', '國家', '歷史', '民俗', '廟', '神明', '旅行', '地圖', '故鄉', '老街'],
    en: ['holiday', 'festival', 'custom', 'cultur', 'people & places', 'history', 'multicultural', 'christmas', 'travel', 'world'] }
]
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
export const UNKNOWN_CAT = { id: null, name: '待確認分類', color: '#C9BFAF' }
export const catOf = (id) => CAT[id] || UNKNOWN_CAT

// 簡體字轉繁體（只涵蓋分類關鍵字用到的字），讓簡體的書籍介紹也能判斷
const S_CHARS = "来个传伤儿创动问单国园图梦妈嬷学宫宝对师帮几厕厨庙张爱惯担数时乐样树机欢历气潜湾为乌灯爷状狮兽画发盗礼种节笼红统绿紧绪习圣脚胆台万叶猬蜗蚂萤虫蚁术里觉访话认诞谊谜识护猪猫买购车较轮运过乡邻医针钟铁开间阳险鸡离难云电灵题颜类风飞饭馆马体鱼鲸鸟鸭鹅么齿龙龟"
const T_CHARS = "來個傳傷兒創動問單國園圖夢媽嬤學宮寶對師幫幾廁廚廟張愛慣擔數時樂樣樹機歡歷氣潛灣為烏燈爺狀獅獸畫發盜禮種節籠紅統綠緊緒習聖腳膽臺萬葉蝟蝸螞螢蟲蟻術裡覺訪話認誕誼謎識護豬貓買購車較輪運過鄉鄰醫針鐘鐵開間陽險雞離難雲電靈題顏類風飛飯館馬體魚鯨鳥鴨鵝麼齒龍龜"
const toTrad = (t) => t.replace(/./gu, (c) => { const i = S_CHARS.indexOf(c); return i >= 0 ? T_CHARS[i] : c })

// 不使用 AI：用書名、介紹、主題關鍵字打分數；完全沒線索才回報「待確認」
export function suggestCategory(book) {
  const title = toTrad((book.title || '') + ' ' + (book.subtitle || ''))
  const desc = toTrad(book.description || '')
  const en = ((book.subjects || []).join(' | ') + ' ' + (book.title || '') + ' ' + (book.description || '')).toLowerCase()
  let best = null
  for (const c of CATEGORIES) {
    let score = 0
    const hits = []
    for (const k of c.zh) {
      if (title.includes(k)) { score += 3 + (k.length > 1 ? 1 : 0); hits.push(k) } else if (desc.includes(k)) { score += k.length > 1 ? 1 : 0.5; hits.push(k) }
    }
    for (const k of c.en) if (en.includes(k)) { score += 1.5; hits.push(k) }
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score, hits: [...new Set(hits)].slice(0, 4) }
  }
  return best && best.score >= 1 ? best : null
}

/* ---------- ISBN ---------- */
export function cleanIsbn(raw) {
  return String(raw || '').toUpperCase().replace(/[^0-9X]/g, '')
}
function isValid13(s) {
  if (!/^97[89]\d{10}$/.test(s)) return false
  const sum = [...s.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === Number(s[12])
}
function isValid10(s) {
  if (!/^\d{9}[\dX]$/.test(s)) return false
  const sum = [...s].reduce((a, ch, i) => a + (ch === 'X' ? 10 : Number(ch)) * (10 - i), 0)
  return sum % 11 === 0
}
function to13(isbn10) {
  const core = '978' + isbn10.slice(0, 9)
  const sum = [...core].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0)
  return core + ((10 - (sum % 10)) % 10)
}
export function normalizeIsbn(raw) {
  const s = cleanIsbn(raw)
  if (s.length === 13 && isValid13(s)) return { isbn13: s, isbn10: null }
  if (s.length === 10 && isValid10(s)) return { isbn13: to13(s), isbn10: s }
  return null
}

/* ---------- 外部書籍資料 ---------- */
const httpsify = (u) => (u ? u.replace(/^http:/, 'https:') : null)

function fromGoogle(item) {
  const v = item.volumeInfo || {}
  const ids = v.industryIdentifiers || []
  const i13 = ids.find((x) => x.type === 'ISBN_13')?.identifier || null
  const i10 = ids.find((x) => x.type === 'ISBN_10')?.identifier || null
  return {
    isbn13: i13 && /^97[89]\d{10}$/.test(i13) ? i13 : null,
    isbn10: i10 && /^\d{9}[\dX]$/.test(i10) ? i10 : null,
    title: [v.title, v.subtitle].filter(Boolean).join('：'),
    authors: v.authors || [],
    publisher: v.publisher || null,
    published_date: v.publishedDate || null,
    description: v.description || null,
    subjects: v.categories || [],
    cover_url: httpsify(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail),
    cover_source: v.imageLinks ? 'google' : 'none',
    source: 'google',
    source_id: item.id,
    language: v.language || null
  }
}

function fromOpenLibraryData(d, isbn13) {
  return {
    isbn13,
    isbn10: d.identifiers?.isbn_10?.[0] || null,
    title: [d.title, d.subtitle].filter(Boolean).join('：'),
    authors: (d.authors || []).map((a) => a.name),
    publisher: d.publishers?.[0]?.name || null,
    published_date: d.publish_date || null,
    description: typeof d.notes === 'string' ? d.notes : d.notes?.value || null,
    subjects: (d.subjects || []).map((s) => s.name).slice(0, 12),
    cover_url: httpsify(d.cover?.medium || d.cover?.small),
    cover_source: d.cover ? 'openlibrary' : 'none',
    source: 'openlibrary',
    source_id: d.key || null,
    language: null
  }
}

async function getJson(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 9000)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (r.status === 429) throw new Error('rate_limited')
    if (!r.ok) throw new Error('http_' + r.status)
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

// 查 ISBN：先查自己的公共書庫（不浪費外部查詢次數），再查 Google Books，最後 Open Library
export async function lookupIsbn(isbn13, onStep = () => {}) {
  onStep('正在查詢書庫…')
  const { data: existing } = await supabase.from('books').select('*').eq('isbn13', isbn13).is('owner_family_id', null).maybeSingle()
  if (existing) return { book: existing, from: '公共書庫（已有人建檔）' }

  onStep('正在查詢 Google Books…')
  try {
    const g = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&maxResults=1`)
    if (g.items?.length) {
      const b = fromGoogle(g.items[0])
      b.isbn13 = isbn13
      return { book: b, from: 'Google Books' }
    }
  } catch (e) {
    if (!navigator.onLine) throw e
  }

  onStep('Google Books 沒有資料，改查 Open Library…')
  const o = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&format=json&jscmd=data`)
  const d = o[`ISBN:${isbn13}`]
  if (d) return { book: fromOpenLibraryData(d, isbn13), from: 'Open Library' }
  return null
}

// 搜尋書名：Google Books 為主，找不到再試 Open Library
export async function searchTitle(q) {
  const term = encodeURIComponent(q.trim())
  const out = []
  try {
    const g = await getJson(`https://www.googleapis.com/books/v1/volumes?q=intitle:${term}&maxResults=20&printType=books`)
    for (const it of g.items || []) out.push(fromGoogle(it))
  } catch (e) {
    if (!navigator.onLine) throw e
  }
  if (!out.length) {
    const o = await getJson(`https://openlibrary.org/search.json?title=${term}&limit=12&fields=key,title,author_name,isbn,cover_i,publisher,first_publish_year,subject,language`)
    for (const d of o.docs || []) {
      const i13 = (d.isbn || []).find((x) => /^97[89]\d{10}$/.test(x)) || null
      out.push({
        isbn13: i13, isbn10: null, title: d.title, authors: d.author_name || [], publisher: d.publisher?.[0] || null,
        published_date: d.first_publish_year ? String(d.first_publish_year) : null, description: null,
        subjects: (d.subject || []).slice(0, 12),
        cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        cover_source: d.cover_i ? 'openlibrary' : 'none', source: 'openlibrary', source_id: d.key,
        language: d.language?.length === 1 ? (d.language[0] === 'eng' ? 'en' : d.language[0]) : null
      })
    }
  }
  return out.filter((b) => b.title)
}

/* ---------- 圖片壓縮 ---------- */
export async function compressImage(file, maxW = 600, maxBytes = 300 * 1024) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    c.getContext('2d').drawImage(img, 0, 0, w, h)
    const toBlob = (type, q) => new Promise((r) => c.toBlob(r, type, q))
    let type = 'image/webp'
    let q = 0.8
    let blob = await toBlob(type, q)
    if (!blob || blob.type !== 'image/webp') { type = 'image/jpeg'; blob = await toBlob(type, q) }
    while (blob && blob.size > maxBytes && q > 0.35) { q -= 0.1; blob = await toBlob(type, q) }
    if (!blob || blob.size > maxBytes) throw new Error('image_too_large')
    return { blob, type, width: w, height: h, originalSize: file.size }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ---------- 日期 ---------- */
const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const ymOf = (s) => s.slice(0, 7)
export const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const shiftMonth = (ym, d) => { const [y, m] = ym.split('-').map(Number); const t = new Date(y, m - 1 + d, 1); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}` }
export const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${y} 年 ${Number(m)} 月` }
export const dayLabel = (s) => { const [, m, d] = s.split('-'); return `${Number(m)} 月 ${Number(d)} 日` }
export const MOODS = { 3: { e: '😍', t: '好喜歡' }, 2: { e: '🙂', t: '還不錯' }, 1: { e: '😐', t: '還好' } }
