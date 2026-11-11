// 動物圖鑑：資料＋「遇過」計算（不用新增資料表，直接從閱讀紀錄算出來）
import { supabase } from './supabase'
import { buildVisitors, isEnglishBook } from './visitors'
import { SEASONS } from './trees'
import { hashStr } from '../components/ReadingTree'

// group: visitor 英文書森林訪客｜season 四季小動物｜xmas 聖誕朋友
// img: public/art 的檔名；say: 唸出來的字（預設用 en）
export const ANIMALS = [
  { id: 'rabbit', group: 'visitor', zh: '小兔子', en: 'Rabbit', img: 'rabbit', fact: '兔子的門牙會一直長長喔', hint: '讀英文書的時候，可能會來玩' },
  { id: 'hedgehog', group: 'visitor', zh: '小刺蝟', en: 'Hedgehog', img: 'hedgehog', fact: '刺蝟害怕的時候，會縮成一顆刺球', hint: '讀英文書的時候，可能會來玩' },
  { id: 'fox', group: 'visitor', zh: '小狐狸', en: 'Fox', img: 'fox', fact: '狐狸睡覺會用大尾巴蓋住自己', hint: '讀英文書的時候，可能會來玩' },
  { id: 'bear', group: 'visitor', zh: '小熊', en: 'Bear', img: 'bear', fact: '熊的鼻子很靈，聞得到好遠的食物', hint: '讀英文書的時候，可能會來玩' },
  { id: 'frog', group: 'visitor', zh: '小青蛙', en: 'Frog', img: 'frog', fact: '青蛙小時候是在水裡游的蝌蚪', hint: '讀英文書的時候，可能會來玩' },
  { id: 'deer', group: 'visitor', zh: '小鹿', en: 'Deer', img: 'deer', fact: '公鹿的角每年會掉，再長出新的', hint: '讀英文書的時候，可能會來玩' },
  { id: 'sheep', group: 'visitor', zh: '笑笑羊', en: 'Sheep', img: 'sheep', fact: '黑鼻羊的臉和膝蓋是黑色的，毛卻是白白捲捲的', hint: '讀英文書的時候，可能會來玩' },
  { id: 'whiteeye', group: 'season', zh: '綠繡眼', en: 'White-eye', say: 'White eye', img: 'whiteeye', fact: '綠繡眼的眼睛外面有一圈白白的毛', hint: '1、2 月的森林會出現' },
  { id: 'butterfly', group: 'season', zh: '蝴蝶', en: 'Butterfly', img: 'butterfly', fact: '蝴蝶小時候是毛毛蟲喔', hint: '3、4 月的森林會出現' },
  { id: 'firefly', group: 'season', zh: '螢火蟲', en: 'Firefly', img: 'firefly', fact: '螢火蟲的屁股會一閃一閃發光', hint: '5 月的森林會出現' },
  { id: 'snail', group: 'season', zh: '蝸牛', en: 'Snail', img: 'snail', fact: '蝸牛背著自己的家，慢慢走', hint: '6 月的森林會出現' },
  { id: 'cicada', group: 'season', zh: '蟬', en: 'Cicada', img: 'cicada', fact: '只有蟬爸爸會唧唧叫喔', hint: '7 月的森林會出現' },
  { id: 'dragonfly', group: 'season', zh: '蜻蜓', en: 'Dragonfly', img: 'bluefly', fact: '蜻蜓有四片翅膀，飛得好快', hint: '8 月的森林會出現' },
  { id: 'redfly', group: 'season', zh: '紅蜻蜓', en: 'Red dragonfly', img: 'redfly', fact: '蜻蜓小時候是住在水裡的', hint: '9 月的森林會出現' },
  { id: 'squirrel', group: 'season', zh: '松鼠', en: 'Squirrel', img: 'squirrel', fact: '松鼠會把堅果藏起來，慢慢吃', hint: '10 月的森林會出現' },
  { id: 'sparrow', group: 'season', zh: '麻雀', en: 'Sparrow', img: 'sparrow', fact: '麻雀走路是一跳一跳的', hint: '11 月的森林會出現' },
  { id: 'elf', group: 'xmas', zh: '小精靈', en: 'Elf', img: 'elf', fact: '小精靈是聖誕老公公的小幫手', hint: '12 月讀英文書，可能會來玩' },
  { id: 'reindeer', group: 'xmas', zh: '小馴鹿', en: 'Reindeer', img: 'reindeer', fact: '馴鹿會拉著雪橇飛奔', hint: '12 月讀英文書，可能會來玩' },
  { id: 'santa', group: 'xmas', zh: '聖誕老公公', en: 'Santa Claus', img: 'santa', fact: '聖誕老公公坐著雪橇送禮物', hint: '12 月 24、25 日一定會來' }
]
export const GROUPS = [['visitor', '英文書森林朋友'], ['season', '四季小動物'], ['xmas', '聖誕朋友']]

const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 這個孩子所有的閱讀紀錄（分頁，一次最多 1000 筆）
export async function fetchAllSessions(childId) {
  const out = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from('reading_sessions')
      .select('id, child_book_id, read_on, growth_shown_at, has_english, child_books(is_english), books(title, language, kind)')
      .eq('child_id', childId).order('read_on').order('id').range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

// 回傳 Map<animalId, 'YYYY-MM-DD'>（第一次遇見的日子）
export function computeMet(rows, childId) {
  const met = new Map()
  const put = (id, date) => { if (id && ANIMALS.some((a) => a.id === id) && (!met.has(id) || date < met.get(id))) met.set(id, date) }
  const months = new Map()
  for (const r of rows) {
    const ym = r.read_on.slice(0, 7)
    if (!months.has(ym)) months.set(ym, [])
    months.get(ym).push(r)
  }
  for (const [ym, list] of months) {
    const month = Number(ym.slice(5, 7))
    const grownDates = list.filter((r) => r.growth_shown_at).map((r) => ymdLocal(new Date(r.growth_shown_at))).sort()
    if (!grownDates.length) continue
    // 四季小動物：這個月孩子澆過水、看過樹
    const season = SEASONS[month]?.animal
    if (season && season !== 'none') put(season, grownDates[0])
    // 聖誕老公公：24、25 日當天一定會來
    if (month === 12 && grownDates.some((d) => d.endsWith('-24') || d.endsWith('-25'))) put('santa', grownDates.find((d) => d.endsWith('-24') || d.endsWith('-25')))
    // 英文書訪客：和花園用同一個函式，結果一定一致
    const byLeaf = new Map()
    for (const r of list) {
      if (!byLeaf.has(r.child_book_id)) byLeaf.set(r.child_book_id, { id: r.child_book_id, book: r.books, cb: r.child_books, sessions: [] })
      byLeaf.get(r.child_book_id).sessions.push(r)
    }
    const leaves = [...byLeaf.values()]
      .filter((l) => l.sessions.some((s) => s.growth_shown_at))
      .map((l) => {
        const mag = l.book?.kind === 'magazine'
        return { id: l.id, book: l.book, sessions: l.sessions, first: l.sessions[0].read_on, en: mag ? l.sessions.some((s) => s.has_english) : isEnglishBook(l.cb, l.book) }
      })
    for (const v of buildVisitors(leaves, childId, ym, 'guava', hashStr)) {
      if (v.special) continue
      const shown = v.leaf.sessions.map((s) => s.growth_shown_at).filter(Boolean).sort()[0]
      put(v.animal, shown ? ymdLocal(new Date(shown)) : ym + '-01')
    }
  }
  return met
}
