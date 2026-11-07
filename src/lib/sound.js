// 孩子模式的聲音：小樹說話（手機內建語音）＋倒水聲＋長葉子的叮咚聲（程式合成，不用音檔）
let ctx = null
function ac() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch { return null }
}

// 小樹說話（中文）
export function sayZh(text) {
  try {
    const s = window.speechSynthesis
    if (!s) return
    s.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-TW'
    const v = s.getVoices().find((x) => /zh[-_]TW/i.test(x.lang)) || s.getVoices().find((x) => /^zh/i.test(x.lang))
    if (v) u.voice = v
    u.rate = 0.95
    u.pitch = 1.35 // 高一點，像小樹的聲音
    s.speak(u)
  } catch { /* 不支援就安靜 */ }
}

// 倒水聲：濾過的白噪音，按住時一直響
let pour = null
export function pourStart() {
  const c = ac()
  if (!c || pour) return
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.8
  // 水流的咕嚕起伏
  const lfo = c.createOscillator(); lfo.frequency.value = 7
  const lfoGain = c.createGain(); lfoGain.gain.value = 500
  lfo.connect(lfoGain).connect(bp.frequency)
  const g = c.createGain()
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.15)
  src.connect(bp).connect(g).connect(c.destination)
  src.start(); lfo.start()
  pour = { src, lfo, g }
}
export function pourStop() {
  const c = ctx
  if (!c || !pour) return
  const p = pour
  pour = null
  p.g.gain.cancelScheduledValues(c.currentTime)
  p.g.gain.setValueAtTime(p.g.gain.value, c.currentTime)
  p.g.gain.linearRampToValueAtTime(0, c.currentTime + 0.15)
  setTimeout(() => { try { p.src.stop(); p.lfo.stop() } catch { /* */ } }, 250)
}

// 長出葉子：叮咚叮（上行三個音）
export function chime() {
  const c = ac()
  if (!c) return
  ;[784, 988, 1319].forEach((f, i) => {
    const t = c.currentTime + i * 0.12
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f
    const g = c.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.25, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    o.connect(g).connect(c.destination)
    o.start(t); o.stop(t + 0.65)
  })
}

// 第一次點擊時先把聲音打開（手機規定要使用者點過才能出聲）
export function unlockAudio() { ac() }

// ---- 小樹的聲音：家長自己錄的句子（存在 Supabase 的 voices 空間） ----
// 沒錄的句子就不出聲
export const VOICE_LINES = [
  { key: 'ask', text: '幫我澆水', when: '一進兒童模式、還有書在等澆水時' },
  { key: 'leaf', text: '長出新葉子了！', when: '每次長出新葉子、葉子變亮時' },
  { key: 'flower', text: '花園開花了！', when: '每讀一次雜誌、花圃開一朵花時（沒錄就用上一句）' },
  { key: 'full', text: '謝謝你，我喝飽了', when: '全部澆完的時候' },
  { key: 'harvest', text: '芭樂收成囉！', when: '芭樂摘完、放進籃子的時候' },
  { key: 'unlock', text: '解鎖新遊戲了！', when: '讀到 50／100／150 次解鎖新遊戲時' }
]
const voiceCache = new Map() // key -> blob URL
let voiceFamily = null
let playing = null

export async function loadVoices(supabase, familyId, force = false) {
  if (voiceFamily === familyId && !force) return voiceCache
  voiceFamily = familyId
  voiceCache.forEach((u) => URL.revokeObjectURL(u))
  voiceCache.clear()
  try {
    const { data } = await supabase.storage.from('voices').list(familyId)
    await Promise.all((data || []).map(async (f) => {
      const key = f.name.split('.')[0]
      const { data: blob } = await supabase.storage.from('voices').download(`${familyId}/${f.name}`)
      if (blob) voiceCache.set(key, URL.createObjectURL(blob))
    }))
  } catch { /* 還沒建立錄音空間就安靜 */ }
  return voiceCache
}
export const hasVoice = (key) => voiceCache.has(key)

// 播放錄好的句子；fallback 是沒錄時改播的另一句
export function playVoice(key, fallback) {
  const url = voiceCache.get(key) || (fallback && voiceCache.get(fallback))
  if (!url) return false
  try {
    playing?.pause()
    playing = new Audio(url)
    playing.play().catch(() => {})
    return true
  } catch { return false }
}
export function playUrl(url) {
  try { playing?.pause(); playing = new Audio(url); playing.play().catch(() => {}) } catch { /* */ }
}

// 數數時的小音效：越數越高
export function tick(i = 0) {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 523 * Math.pow(2, Math.min(i, 12) / 12)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.3)
}
// 答錯：輕輕的「咚」，不刺耳
export function boop() {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.2)
  const g = c.createGain()
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.35)
}
