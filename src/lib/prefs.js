// 每台裝置自己的偏好（存在瀏覽器）
const KEY = 'sf-calm'
export function getCalm() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export function setCalm(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* 無痕模式 */ }
  applyCalm(on)
}
export function applyCalm(on = getCalm()) {
  document.documentElement.classList.toggle('calm', on)
}
export const prefersCalm = () => getCalm() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
