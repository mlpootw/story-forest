// 芭樂收成：樹上熟了 20 顆，孩子可以一顆一顆摘進籃子。
// 只是畫面的「收成」：閱讀紀錄、芭樂總數、成長規則都不會變；已收成的書記在這台裝置上（每個孩子、每個月各一份）
export const HARVEST_AT = 20
const mem = new Map()
const key = (childId, ym) => `sf-harvest-${childId}-${ym}`

export function getHarvested(childId, ym) {
  const k = key(childId, ym)
  if (!mem.has(k)) {
    let v = []
    try { v = JSON.parse(localStorage.getItem(k) || '[]') } catch { /* 不能存就只記在這次 */ }
    mem.set(k, Array.isArray(v) ? v : [])
  }
  return mem.get(k)
}
export function addHarvested(childId, ym, ids) {
  const k = key(childId, ym)
  const next = [...new Set([...getHarvested(childId, ym), ...ids])]
  mem.set(k, next)
  try { localStorage.setItem(k, JSON.stringify(next)) } catch { /* */ }
  return next
}
