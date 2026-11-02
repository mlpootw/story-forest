// 果實規則：和孩子選的心情無關，避免為了果實只按「好喜歡」
//   1. 這個月重讀（讀 2 次以上）
//   2. 爸媽在書房標成 ♥ 最喜歡
//   3. 驚喜：每片葉子有固定的機會結果（依書的編號決定，重新整理也不會變）
function h(s) {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) }
  return x >>> 0
}
export const isSurprise = (leafId) => h(leafId + '|fruit') % 3 === 0
export function fruitReason(leaf) {
  if (leaf.count >= 2) return 'reread'
  if (leaf.favorite) return 'favorite'
  if (isSurprise(leaf.id)) return 'surprise'
  return null
}
export const FRUIT_REASON_TEXT = {
  reread: '這個月讀了 2 次以上',
  favorite: '爸媽標成了最喜歡的書',
  surprise: '森林送來的驚喜'
}
