// 把 Supabase 的英文錯誤轉成家長看得懂的中文
const MAP = [
  [/Invalid login credentials/i, 'Email 或密碼不正確。'],
  [/User already registered/i, '這個 Email 已經註冊過了，請直接登入。'],
  [/Email not confirmed/i, '還沒完成 Email 驗證，請到信箱點確認連結（也看看垃圾郵件匣）。'],
  [/Password should be at least/i, '密碼至少要 8 個字元。'],
  [/rate limit/i, '寄信次數太頻繁，請過一陣子再試。'],
  [/Unable to validate email|invalid format/i, 'Email 格式不正確。'],
  [/New password should be different/i, '新密碼不能和舊密碼一樣。'],
  [/Failed to fetch|NetworkError|Load failed/i, '連不上伺服器，請確認網路後再試一次。'],
  [/already_in_family/, '你已經在一個家庭裡了。'],
  [/invalid_code/, '找不到這組邀請碼，請確認有沒有打錯。'],
  [/code_used/, '這組邀請碼已經使用過了，請對方再產生一組新的。'],
  [/code_expired/, '這組邀請碼已過期（7 天有效），請對方再產生一組新的。'],
  [/too_many_invites/, '目前已有 5 組還沒使用的邀請碼，請先使用或等它們過期。'],
  [/no_family/, '還沒有加入家庭。'],
  [/not_authenticated|JWT/i, '登入已過期，請重新登入。'],
  [/row-level security|permission denied/i, '沒有權限進行這個操作。']
]

export const PAUSED_HINT = '連不上資料庫。如果你的網路是正常的，可能是 Supabase 免費專案超過一週沒有使用，被自動暫停了：請登入 supabase.com，打開你的專案，按「Restore project」，等 2～3 分鐘後再回來重新整理。資料不會遺失。'

export function zhError(err) {
  const msg = typeof err === 'string' ? err : err?.message || ''
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg) && navigator.onLine) return PAUSED_HINT
  for (const [re, zh] of MAP) if (re.test(msg)) return zh
  return '發生問題，請稍後再試一次。' + (msg ? `（${msg}）` : '')
}
