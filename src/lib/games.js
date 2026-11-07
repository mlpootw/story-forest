// 小遊戲：清單、解鎖門檻、今天可以玩幾輪
// 解鎖：共讀次數（澆過水的紀錄，從開始使用一直累積；重讀、雜誌都算）
// 輪數：今天每澆水長出一本書（雜誌每一次）＝ 3 輪，所有遊戲共用，記在這台裝置
export const GAMES = [
  { id: 'memory', name: '封面翻翻樂', icon: '🃏', desc: '找出一樣的封面', unlock: 0 },
  { id: 'math', name: '小動物加減法', icon: '🐰', desc: '幾隻小動物加幾隻？', unlock: 50 },
  { id: 'pinball', name: '森林彈珠台', icon: '🎯', desc: '射彈珠、拿高分！', unlock: 100 },
  { id: 'puzzle', name: '封面拼圖', icon: '🧩', desc: '把封面拼回來', soon: true },
  { id: 'catch', name: '接書接果實', icon: '🧺', desc: '用籃子接住掉下來的書', soon: true },
  { id: 'seek', name: '森林找一找', icon: '🔍', desc: '找出躲起來的小動物', soon: true },
  { id: 'say', name: '看封面說書名', icon: '🗣️', desc: '這是哪一本書？', soon: true }
]
export const ROUNDS_PER_BOOK = 3

const ymdLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// 今天澆水的「單位」：繪本一本算一次、雜誌每一次算一次
export function wateredUnitsToday(rows) {
  const today = ymdLocal()
  const units = new Set()
  rows.forEach((r) => {
    if (!r.growth_shown_at || ymdLocal(new Date(r.growth_shown_at)) !== today) return
    units.add(r.books?.kind === 'magazine' ? r.id : r.child_book_id)
  })
  return units.size
}

const key = (childId) => `sf-games-${childId}-${ymdLocal()}`
export function playedToday(childId) {
  try { return Number(localStorage.getItem(key(childId))) || 0 } catch { return 0 }
}
export function addRound(childId) {
  const n = playedToday(childId) + 1
  try { localStorage.setItem(key(childId), String(n)) } catch { /* 無痕模式 */ }
  return n
}

// 這個孩子從開始到現在澆過水的共讀次數
export async function totalWatered(supabase, childId) {
  const { count } = await supabase.from('reading_sessions').select('id', { count: 'exact', head: true })
    .eq('child_id', childId).not('growth_shown_at', 'is', null)
  return count ?? 0
}

// 剛好跨過某個門檻 → 回傳那個遊戲
export function newlyUnlocked(before, after) {
  return GAMES.find((g) => !g.soon && g.unlock > 0 && before < g.unlock && after >= g.unlock) || null
}
