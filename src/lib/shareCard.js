// 產生「最愛書單」分享圖卡（canvas → JPEG）
// 版型依書的數量自動切換：1 本／2～4 本／5～9 本；超過 9 本自動分頁
import { catOf } from './books'

const W = 1080
const PAPER = '#F8F4EB'
const INK = '#5C5146'
const SOFT = '#8A7E70'
const LINE = '#E2D8C5'
const HAND = '"LXGW WenKai TC", "Kaiti TC", serif'
const BODY = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif'

// 透過自己網站的 /api/img 抓封面，才能畫進 canvas 並存成圖片
function proxied(url) {
  if (!url) return null
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  return `/api/img?u=${encodeURIComponent(url)}`
}
function loadImg(url) {
  return new Promise((res) => {
    if (!url) return res(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const t = setTimeout(() => res(null), 8000)
    img.onload = () => { clearTimeout(t); res(img) }
    img.onerror = () => { clearTimeout(t); res(null) }
    img.src = url
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 中文逐字換行
function wrap(ctx, text, maxW, maxLines) {
  const lines = []
  let cur = ''
  for (const ch of text || '') {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur)
      cur = ch
      if (lines.length === maxLines) break
    } else cur += ch
  }
  if (lines.length < maxLines && cur) lines.push(cur)
  if (lines.length === maxLines && lines.join('').length < (text || '').length) {
    let last = lines[maxLines - 1]
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1)
    lines[maxLines - 1] = last + '…'
  }
  return lines
}

function drawCover(ctx, img, item, x, y, w, h) {
  ctx.save()
  ctx.shadowColor = 'rgba(92,81,70,.22)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 6
  roundRect(ctx, x, y, w, h, 10)
  ctx.fillStyle = catOf(item.category).color
  ctx.fill()
  ctx.restore()
  ctx.save()
  roundRect(ctx, x, y, w, h, 10)
  ctx.clip()
  if (img) {
    // 等比例填滿
    const s = Math.max(w / img.width, h / img.height)
    const iw = img.width * s
    const ih = img.height * s
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  } else {
    ctx.fillStyle = 'rgba(248,244,235,.45)'
    ctx.beginPath()
    ctx.arc(x + w * 0.65, y + h * 0.78, w * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(w * 0.12)}px ${HAND}`
    wrap(ctx, item.title, w * 0.8, 4).forEach((l, i) => ctx.fillText(l, x + w * 0.1, y + h * 0.12 + w * 0.12 + i * w * 0.15))
  }
  ctx.restore()
}

function chips(item, opts) {
  const c = []
  if (opts.age && opts.ageText) c.push(`${opts.ageText}愛看`)
  if (opts.count && item.count > 1) c.push(`讀了 ${item.count} 次`)
  return c
}

function drawHeader(ctx, opts, page, pages) {
  ctx.fillStyle = INK
  ctx.font = `bold 64px ${HAND}`
  ctx.textAlign = 'center'
  const who = opts.nickname && opts.childName ? `${opts.childName}的` : '我們家的'
  ctx.fillText(`📚 ${who}最愛繪本`, W / 2, 130)
  ctx.font = `30px ${BODY}`
  ctx.fillStyle = SOFT
  ctx.fillText(`${opts.dateText}${pages > 1 ? `　·　${page}／${pages}` : ''}`, W / 2, 185)
  ctx.textAlign = 'left'
}

function drawFooter(ctx, H) {
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(80, H - 110); ctx.lineTo(W - 80, H - 110); ctx.stroke()
  ctx.fillStyle = SOFT
  ctx.font = `28px ${HAND}`
  ctx.textAlign = 'center'
  ctx.fillText('🌳 小小書房｜故事森林　每一本故事，都是一片葉子', W / 2, H - 55)
  ctx.textAlign = 'left'
}

async function renderSingle(item, img, opts) {
  const c = document.createElement('canvas'); c.width = W; c.height = 1700
  const ctx = c.getContext('2d')
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, 1700)
  drawHeader(ctx, opts, 1, 1)
  const cw = 520, ch = 693
  drawCover(ctx, img, item, (W - cw) / 2, 240, cw, ch)
  let y = 240 + ch + 90
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = `bold 56px ${HAND}`
  wrap(ctx, `《${item.title}》`, W - 160, 2).forEach((l) => { ctx.fillText(l, W / 2, y); y += 68 })
  ctx.font = `30px ${BODY}`
  ctx.fillStyle = SOFT
  const meta = [item.authors, item.publisher].filter(Boolean).join('　·　')
  if (meta) { wrap(ctx, meta, W - 200, 1).forEach((l) => ctx.fillText(l, W / 2, y)); y += 56 }
  const cs = chips(item, opts)
  if (cs.length) {
    ctx.font = `bold 30px ${BODY}`
    const text = cs.join('　·　')
    const tw = ctx.measureText(text).width + 60
    roundRect(ctx, (W - tw) / 2, y - 38, tw, 56, 28)
    ctx.fillStyle = '#EEF2EA'; ctx.fill()
    ctx.fillStyle = '#5F8468'
    ctx.fillText(text, W / 2, y)
    y += 70
  }
  if (opts.note && item.note) {
    ctx.font = `36px ${HAND}`
    ctx.fillStyle = '#98775F'
    wrap(ctx, `「${item.note}」`, W - 220, 2).forEach((l) => { ctx.fillText(l, W / 2, y + 10); y += 50 })
  }
  ctx.textAlign = 'left'
  // 高度跟著內容走，避免下方留白
  const H = Math.round(y + 150)
  const out = document.createElement('canvas'); out.width = W; out.height = H
  const o = out.getContext('2d')
  o.drawImage(c, 0, 0)
  drawFooter(o, H)
  return out
}

async function renderGrid(items, imgs, opts, page, pages) {
  const cols = items.length <= 4 ? 2 : 3
  const rows = Math.ceil(items.length / cols)
  const gap = 44
  const cw = (W - 160 - gap * (cols - 1)) / cols
  const coverH = cw * 4 / 3
  const textH = cols === 2 ? 210 : 190
  const cellH = coverH + textH
  const H = 260 + rows * cellH + (rows - 1) * 30 + 150
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H)
  drawHeader(ctx, opts, page, pages)
  items.forEach((it, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 80 + col * (cw + gap)
    const y = 250 + row * (cellH + 30)
    drawCover(ctx, imgs[i], it, x, y, cw, coverH)
    let ty = y + coverH + (cols === 2 ? 56 : 48)
    ctx.fillStyle = INK
    ctx.font = `bold ${cols === 2 ? 38 : 32}px ${HAND}`
    wrap(ctx, it.title, cw, 2).forEach((l) => { ctx.fillText(l, x, ty); ty += cols === 2 ? 46 : 40 })
    const sub = []
    const cs = chips(it, { ...opts, age: false })
    if (cs.length) sub.push(cs[0])
    ctx.font = `${cols === 2 ? 26 : 23}px ${BODY}`
    if (sub.length) { ctx.fillStyle = '#5F8468'; ctx.fillText(sub.join(' · '), x, ty + 2); ty += cols === 2 ? 38 : 34 }
    if (opts.note && it.note) {
      ctx.fillStyle = '#98775F'
      ctx.font = `${cols === 2 ? 28 : 24}px ${HAND}`
      wrap(ctx, `「${it.note}」`, cw, cols === 2 ? 2 : 1).forEach((l) => { ctx.fillText(l, x, ty + 4); ty += cols === 2 ? 36 : 32 })
    }
  })
  if (opts.age && opts.ageText) {
    ctx.textAlign = 'center'; ctx.fillStyle = '#5F8468'; ctx.font = `bold 28px ${BODY}`
    ctx.fillText(`${opts.ageText}的孩子愛看`, W / 2, H - 140)
    ctx.textAlign = 'left'
  }
  drawFooter(ctx, H)
  return c
}

const toBlob = (c) => new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))

// items: [{ title, authors, publisher, cover, note, count, category }]
export async function renderShareImages(items, opts) {
  await document.fonts?.ready
  const imgs = await Promise.all(items.map((it) => loadImg(proxied(it.cover))))
  const out = []
  if (items.length === 1) {
    out.push(await toBlob(await renderSingle(items[0], imgs[0], opts)))
  } else {
    const pages = Math.ceil(items.length / 9)
    for (let p = 0; p < pages; p++) {
      const slice = items.slice(p * 9, p * 9 + 9)
      out.push(await toBlob(await renderGrid(slice, imgs.slice(p * 9, p * 9 + 9), opts, p + 1, pages)))
    }
  }
  return out
}

export function shareText(items, opts) {
  const who = opts.nickname && opts.childName ? `${opts.childName}的` : '我們家的'
  const lines = [`📚 ${who}最愛繪本${opts.age && opts.ageText ? `（${opts.ageText}）` : ''}`, '']
  items.forEach((it, i) => {
    const meta = [it.authors, it.publisher].filter(Boolean).join('／')
    lines.push(`${i + 1}.《${it.title}》${meta ? ` ${meta}` : ''}${opts.count && it.count > 1 ? `｜讀了 ${it.count} 次` : ''}`)
    if (opts.note && it.note) lines.push(`　💬 ${it.note}`)
  })
  lines.push('', '— 小小書房｜故事森林')
  return lines.join('\n')
}
