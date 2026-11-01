// 書籍相關：分類、ISBN、外部查詢、自動分類建議、日期工具
import { supabase } from './supabase'

/* ---------- 八大分類（id 與資料庫 book_categories 一致） ---------- */
export const CATEGORIES = [
  { id: 'emotion', name: '情緒與自我認識', color: '#C88F99',
    zh: ['情緒', '生氣', '害怕', '膽小', '哭', '心情', '勇敢', '難過', '傷心', '自信', '脾氣', '開心', '嫉妒', '孤單', '我自己', '做自己', '感覺'],
    en: ['emotions', 'feelings', 'self-esteem', 'self-perception', 'fear', 'anger'] },
  { id: 'social', name: '人際與社交', color: '#D5A57C',
    zh: ['朋友', '友誼', '分享', '一起', '合作', '幫忙', '幫助', '輪流', '等待', '鄰居', '禮貌', '吵架', '道歉', '家人', '兄弟', '姊妹', '弟弟', '妹妹', '同學', '上學'],
    en: ['friendship', 'social themes', 'sharing', 'manners', 'siblings', 'family', 'school'] },
  { id: 'nature', name: '自然與科學', color: '#83A48A',
    zh: ['動物', '植物', '昆蟲', '雨', '樹', '葉子', '花', '蝸牛', '螢火蟲', '種子', '海洋', '大海', '科學', '天氣', '森林', '恐龍', '身體', '季節', '小鳥', '青蛙', '宇宙', '星星', '太空'],
    en: ['animals', 'nature', 'science', 'insects', 'dinosaurs', 'plants', 'weather', 'seasons', 'ocean', 'space'] },
  { id: 'vehicle', name: '交通與機械', color: '#D6B65E',
    zh: ['汽車', '火車', '挖土機', '工程車', '吊車', '卡車', '公車', '消防車', '救護車', '警車', '飛機', '機器', '機械', '工地', '引擎', '捷運', '垃圾車', '車子'],
    en: ['transportation', 'vehicles', 'trucks', 'trains', 'cars', 'machines', 'construction', 'airplanes'] },
  { id: 'life', name: '生活與習慣', color: '#A5B6A0',
    zh: ['刷牙', '睡覺', '睡前', '晚安', '吃飯', '挑食', '洗澡', '上廁所', '尿布', '習慣', '起床', '收拾', '穿衣', '生病', '看醫生', '安全'],
    en: ['bedtime', 'health & daily living', 'toilet training', 'hygiene', 'daily activities', 'personal safety'] },
  { id: 'imagination', name: '想像與創造', color: '#AD9DBD',
    zh: ['想像', '魔法', '奇幻', '冒險', '夢', '怪獸', '巫婆', '公主', '王子', '童話', '發明', '畫畫', '創作', '神奇', '飛'],
    en: ['imagination', 'fantasy', 'magic', 'fairy tales', 'monsters', 'adventure', 'art'] },
  { id: 'cognition', name: '認知與思考', color: '#8EAEBB',
    zh: ['數數', '數一數', '數字', '形狀', '顏色', '大小', '分類', '比較', '認識', 'ABC', '字母', '躲貓貓', '找一找', '時間', '左右', '相反'],
    en: ['concepts', 'counting', 'numbers', 'colors', 'shapes', 'alphabet', 'opposites', 'size'] },
  { id: 'culture', name: '文化與世界', color: '#BE9582',
    zh: ['外婆', '阿嬤', '奶奶', '爺爺', '節日', '過年', '新年', '中秋', '端午', '傳統', '世界', '各地', '台灣', '國家', '歷史', '民俗'],
    en: ['holidays', 'festivals', 'customs', 'cultural', 'people & places', 'history', 'multicultural'] }
]
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
export const UNKNOWN_CAT = { id: null, name: '待確認分類', color: '#C9BFAF' }
export const catOf = (id) => CAT[id] || UNKNOWN_CAT

// 不使用 AI：用書名、介紹、主題關鍵字打分數；分數太低就回報「待確認」
export function suggestCategory(book) {
  const title = (book.title || '') + ' ' + (book.subtitle || '')
  const desc = book.description || ''
  const subjects = (book.subjects || []).join(' | ').toLowerCase()
  let best = null
  for (const c of CATEGORIES) {
    let score = 0
    const hits = []
    for (const k of c.zh) {
      if (title.includes(k)) { score += 3; hits.push(k) } else if (desc.includes(k)) { score += 1; hits.push(k) }
    }
    for (const k of c.en) if (subjects.includes(k)) { score += 2; hits.push(k) }
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score, hits: [...new Set(hits)].slice(0, 4) }
  }
  return best && best.score >= 2 ? best : null
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
    source_id: item.id
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
    source_id: d.key || null
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
    const o = await getJson(`https://openlibrary.org/search.json?title=${term}&limit=12&fields=key,title,author_name,isbn,cover_i,publisher,first_publish_year,subject`)
    for (const d of o.docs || []) {
      const i13 = (d.isbn || []).find((x) => /^97[89]\d{10}$/.test(x)) || null
      out.push({
        isbn13: i13, isbn10: null, title: d.title, authors: d.author_name || [], publisher: d.publisher?.[0] || null,
        published_date: d.first_publish_year ? String(d.first_publish_year) : null, description: null,
        subjects: (d.subject || []).slice(0, 12),
        cover_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
        cover_source: d.cover_i ? 'openlibrary' : 'none', source: 'openlibrary', source_id: d.key
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
