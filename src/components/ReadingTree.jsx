import { useMemo, useState } from 'react'
import { SPECIES, SEASONS, groundFlower, animal } from '../lib/trees'
import { catOf } from '../lib/books'
import { visitorSvg } from '../lib/visitors'
import { art } from '../lib/art'
import { flowerOf, flowerHead } from '../lib/monthFlowers'
import { TREE_SETS } from '../lib/treeArt'

/* ---------- 穩定的亂數：同樣的資料永遠畫出同樣的樹 ---------- */
export function hashStr(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const stageOf = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 8 ? 2 : n < 15 ? 3 : n < 25 ? 4 : 5)
export const STAGES = ['等待第一片葉子', '種子與初生葉', '萌芽', '小樹', '茂盛的樹', '成熟大樹']

const BASE_X = 180
const BASE_Y = 330
const f1 = (n) => n.toFixed(1)

/* ---------- 一般果樹：分枝生長 ---------- */
function buildBranchy(seed, stage, sp) {
  const r = rng(hashStr(seed))
  const branches = []
  const tips = []
  if (stage <= 1) {
    const top = stage === 0 ? 316 : 292
    branches.push({ d: `M${BASE_X},${BASE_Y} Q${BASE_X - 6},${(BASE_Y + top) / 2} ${BASE_X + 2},${top}`, w: stage === 0 ? 2.2 : 3.2 })
    return { branches, anchors: [{ x: BASE_X + 4, y: top - 2, a: -60 }, { x: BASE_X - 2, y: top + 6, a: 200 }, { x: BASE_X + 6, y: top + 12, a: -20 }], top: { x: BASE_X, y: top } }
  }
  const P = { 2: { len: 52, w: 6, depth: 1 }, 3: { len: 64, w: 9.5, depth: 3 }, 4: { len: 72, w: 13, depth: 4 }, 5: { len: 80, w: 17, depth: 5 } }[stage]
  const spread = sp.spread || 0.5
  const droop = sp.droop || 0
  function grow(x, y, ang, len, w, depth) {
    const ex = x + Math.cos(ang) * len
    const ey = y + Math.sin(ang) * len
    const bend = (r() - 0.5) * len * 0.35
    const cx = (x + ex) / 2 + Math.cos(ang + Math.PI / 2) * bend
    const cy = (y + ey) / 2 + Math.sin(ang + Math.PI / 2) * bend
    branches.push({ d: `M${f1(x)},${f1(y)} Q${f1(cx)},${f1(cy)} ${f1(ex)},${f1(ey)}`, w })
    if (depth <= 0) { tips.push({ x: ex, y: ey + droop * 10, a: (ang * 180) / Math.PI }); return }
    if (depth < P.depth) tips.push({ x: (x + ex) / 2 + (r() - 0.5) * 10, y: (y + ey) / 2, a: (ang * 180) / Math.PI })
    const n = depth >= 2 && r() < 0.35 ? 3 : 2
    for (let i = 0; i < n; i++) {
      const s = n === 3 ? [-1.1, 0, 1.1][i] * spread : [-1, 1][i] * spread
      let na = ang + s + (r() - 0.5) * 0.3 + droop * 0.15
      na = Math.max(-Math.PI * 0.95, Math.min(-Math.PI * 0.05, na))
      grow(ex, ey, na, len * (0.72 + r() * 0.1), Math.max(1.4, w * 0.66), depth - 1)
    }
  }
  grow(BASE_X, BASE_Y, -Math.PI / 2 + (r() - 0.5) * 0.12, P.len * (sp.lenMul || 1), P.w * (sp.wMul || 1), P.depth)
  const anchors = []
  const ok = (p) => p.x > 14 && p.x < 346 && p.y > 14 && p.y < BASE_Y - 22 && anchors.every((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 > 150)
  tips.forEach((t) => {
    if (ok(t)) anchors.push(t)
    for (let k = 0; k < 5; k++) {
      const a = r() * Math.PI * 2
      const d = 11 + r() * 10
      const p = { x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, a: (a * 180) / Math.PI }
      if (ok(p)) anchors.push(p)
    }
  })
  const top = anchors.reduce((m, p) => (p.y < m.y ? p : m), { x: BASE_X, y: BASE_Y - 60 })
  return { branches, anchors, top }
}

/* ---------- 媽媽畫的果樹：讀 1～7 本是小樹，8 本以上是大樹；一本書＝一顆果實 ---------- */
const GROUND = 336
function buildArt(stage, set, n) {
  const pick = stage >= 3 ? set.big : n >= 4 && set.mid ? set.mid : set.young
  const w = stage >= 3 ? (pick.w ? pick.w[stage] : { 3: 240, 4: 290, 5: 330 }[stage]) : (pick === set.mid ? (pick.h || 178) : stage === 1 ? 112 : 140) / pick.ratio
  const h = w * pick.ratio
  const x0 = BASE_X - w / 2
  const y0 = GROUND - h
  // 果蒂接在樹枝下緣的掛點；side＝成串時第 2 顆要往哪一邊挪（離最近的鄰居遠一點那邊）
  const pts = pick.hang.map(([u, v]) => ({ x: x0 + u * w, y: y0 + v * h, a: 0 }))
  const anchors = pts.map((q, i) => {
    let best = null
    pts.forEach((o, j) => { if (j !== i) { const d = (o.x - q.x) ** 2 + (o.y - q.y) ** 2; if (!best || d < best.d) best = { d, dx: o.x - q.x } } })
    return { ...q, side: best && best.dx > 0 ? -1 : 1 }
  })
  // 果實高度（畫面單位）：小樹 18、中樹 22、大樹 24／22／20
  const fsz = set.fsz ? (stage >= 3 ? set.fsz[stage] : pick === set.mid ? set.fsz.mid : set.fsz.young) : stage >= 3 ? { 3: 24, 4: 22, 5: 20 }[stage] : pick === set.mid ? 22 : 18
  const top = { x: BASE_X, y: y0 + h * 0.15 }
  return { branches: [], anchors, top, fsz, img: { href: art(pick.img), x: x0, y: y0, w, h } }
}

/* ---------- 香蕉：一根假莖＋大葉片 ---------- */
function buildBanana(seed, stage) {
  const r = rng(hashStr(seed))
  const H = [14, 36, 80, 125, 160, 188][stage]
  const topX = BASE_X + (r() - 0.5) * 6
  const topY = BASE_Y - H
  const branches = [{ d: `M${BASE_X},${BASE_Y} C${BASE_X - 3},${BASE_Y - H * 0.4} ${topX + 2},${topY + H * 0.3} ${f1(topX)},${f1(topY)}`, w: [3, 4, 7, 10, 12, 14][stage], stem: true }]
  const fronds = []
  const anchors = []
  const nF = [1, 2, 3, 5, 6, 7][stage]
  const L = [16, 30, 52, 70, 82, 92][stage]
  for (let i = 0; i < nF; i++) {
    const side = i % 2 ? 1 : -1
    const ang = -Math.PI / 2 + side * (0.35 + (i >> 1) * 0.42 + r() * 0.12)
    const ex = topX + Math.cos(ang) * L
    const ey = topY + Math.sin(ang) * L + L * 0.25
    const cx = topX + Math.cos(ang) * L * 0.5
    const cy = topY + Math.sin(ang) * L * 0.5 - L * 0.12
    fronds.push(`M${f1(topX)},${f1(topY)} Q${f1(cx)},${f1(cy)} ${f1(ex)},${f1(ey)}`)
    const steps = Math.max(2, Math.round(L / 13))
    for (let k = 1; k <= steps; k++) {
      const t = 0.3 + (0.7 * k) / steps
      const x = (1 - t) ** 2 * topX + 2 * (1 - t) * t * cx + t * t * ex
      const y = (1 - t) ** 2 * topY + 2 * (1 - t) * t * cy + t * t * ey
      anchors.push({ x, y: y - 5, a: (ang * 180) / Math.PI - 50 }, { x: x + 2, y: y + 5, a: (ang * 180) / Math.PI + 50 })
    }
  }
  return { branches, fronds, anchors, top: { x: topX, y: topY } }
}

// 花圃的位置：散在整片草地的左右兩邊（樹幹前面留空），一朵一朵分開，蝴蝶飛得過去
const BED = (() => {
  const xs = [-58, 62, -118, 120, -88, 92, -146, 148, -34, 36, -72, 76, -132, 134, -104, 106, -46, 50, -160, 160, -24, 26, -64, 66, -124, 126, -94, 96, -152, 154]
  return xs.map((dx, i) => [dx, [341, 347, 344, 350, 339][i % 5]])
})()

/* ---------- 組合成 SVG ---------- */
function renderTree({ seed, ym, speciesId, leaves: allLeaves, pendingIds = [], growIds = [], flashIds = [], popIds = [], visitors = [], flowers = [], shown = null, harvestedIds = [], hideIds = [] }) {
  const sp = SPECIES[speciesId] || SPECIES.guava
  const n = allLeaves.length
  const stage = stageOf(n)
  const set = TREE_SETS[speciesId]
  // 已收成的芭樂不再掛在樹上（總數、樹的大小還是照全部算）；掛點照剩下的排，摘的過程中（hideIds）不重排
  const leaves = set && harvestedIds.length ? allLeaves.filter((l) => !harvestedIds.includes(l.id)) : allLeaves
  const T = sp.structure === 'banana' ? buildBanana(seed, stage) : set && stage > 0 ? buildArt(stage, set, n) : buildBranchy(seed, stage, sp)
  const r = rng(hashStr('d' + seed))
  const month = Number(ym.slice(5, 7))
  const season = SEASONS[month]

  // 葉子位置：依書的編號決定，重新整理也不會變
  const used = new Set()
  // 12 月：雪人站在樹旁邊（掛點會避開雪人）
  const snow = month === 12 ? (() => {
    const w = [34, 38, 44, 52, 58][Math.max(0, stage - 1)] || 40
    const cx = BASE_X - [64, 84, 98, 104, 112][Math.max(0, stage - 1)]
    return { w, h: w * 1.31, cx, x0: cx - w / 2 - 3, x1: cx + w / 2 + 3, y0: 341 - w * 1.31 - 4 }
  })() : null
  const snowman = snow ? `<image class="sf-snowman" href="${art('snowman')}" x="${f1(snow.cx - snow.w / 2)}" y="${f1(341 - snow.h)}" width="${snow.w}" height="${f1(snow.h)}"/>` : ''
  const free = snow && T.img ? T.anchors.filter((q) => !(q.x + (T.fsz || 18) * 1.1 > snow.x0 && q.x - (T.fsz || 18) * 1.1 < snow.x1 && q.y + (T.fsz || 18) * 1.1 > snow.y0)) : T.anchors
  const A = free.length ? free : [{ x: BASE_X, y: BASE_Y - 30, a: -60 }]
  const scale = (n > 30 ? 1.1 : n > 20 ? 1.3 : 1.6) * sp.leafScale
  const placed = leaves.map((l, idx) => {
    if (T.img) return { l, p: A[idx % A.length], rot: 0, idx, ring: Math.floor(idx / A.length) }
    let i = hashStr(l.id + ym) % A.length
    let g = 0
    while (used.has(i) && g < A.length) { i = (i + 7) % A.length; g++ }
    used.add(i)
    const base = A[i]
    const over = g >= A.length ? idx : 0
    const p = over ? { x: base.x + ((hashStr(l.id) % 13) - 6), y: base.y + ((hashStr(l.id + 'y') % 13) - 6), a: base.a } : base
    // 畫的樹：葉子朝外長，稍微歪一點才自然
    const rot = sp.structure === 'banana' ? p.a : T.img ? p.a + ((hashStr(l.id) % 70) - 35) : (hashStr(l.id) % 360) - 180
    return { l, p, rot }
  })

  const wash = stage >= 3 && !T.img ? `<g filter="url(#blur)">${Array.from({ length: 5 }, () => `<circle cx="${f1(T.top.x + (r() - 0.5) * 170)}" cy="${f1((T.top.y + BASE_Y) / 2 - 30 + (r() - 0.5) * 90)}" r="${f1(40 + r() * 40)}" fill="#9CC38A" opacity=".2"/>`).join('')}</g>` : ''
  const brOut = T.branches.map((b) => `<path d="${b.d}" stroke="#5E4636" stroke-width="${f1(b.w + 3.4)}" stroke-linecap="round" fill="none" opacity=".85"/>`).join('')
  const br = T.branches.map((b) => `<path d="${b.d}" stroke="${sp.trunk}" stroke-width="${b.w}" stroke-linecap="round" fill="none"/><path d="${b.d}" stroke="#D2BDA6" stroke-width="${f1(b.w * 0.32)}" stroke-linecap="round" fill="none" opacity=".45" transform="translate(-${f1(b.w * 0.18)},0)"/>`).join('')
  const fronds = (T.fronds || []).map((d) => `<path d="${d}" stroke="#A9BE8E" stroke-width="${stage >= 3 ? 9 : 6}" stroke-linecap="round" fill="none" opacity=".55"/><path d="${d}" stroke="#8FA676" stroke-width="1.2" fill="none" opacity=".8"/>`).join('')

  let grass = ''
  for (let i = 0; i < 12; i++) {
    const x = 40 + r() * 280
    const h = 6 + r() * 10
    grass += `<path d="M${f1(x)},336 q${f1(r() * 4 - 2)},-${f1(h / 2)} ${f1(r() * 6 - 3)},-${f1(h)}" stroke="#6F9A63" stroke-width="2" fill="none" opacity=".85" stroke-linecap="round"/>`
  }
  let groundFlowers = ''
  const fr = rng(hashStr('f' + ym))
  const fallenLike = season.flower === 'fallen' || season.flower === 'maple'
  for (let i = 0; i < (fallenLike ? 9 : 6); i++) groundFlowers += groundFlower(season.flower, 60 + fr() * 240, 334 + fr() * 6, fr())

  // 畫的果樹：每本書是一顆果實，果蒂（圖上方）接在樹枝下緣的掛點，果實自然往下垂
  //（還沒澆水是一朵花；讀 2 次以上變熟、變大）。掛點不夠時，同一個掛點會掛第 2、3 顆（成串）
  const FB = set && set.fruitBox
  const RING_TILT = set && set.ringTilt ? set.ringTilt : [0, 26, -26, 42, -42]
  const SPREAD = set && set.spread ? set.spread : [0, 0.62, -0.62, 0.3, -0.3]
  const DROP = set && set.drop ? set.drop : [0, 0, 0, 0.6, 0.6]
  const RING_SCALE = [1, 0.94, 0.9, 0.86, 0.82]
  const covers = []
  const fruitArt = T.img ? placed.filter(({ l }) => !hideIds.includes(l.id)).map(({ l, p, ring }) => {
    const pend = pendingIds.includes(l.id)
    const ripe = l.count > 1
    const rk = Math.min(ring, 4)
    const base = pend ? T.fsz : T.fsz + Math.min(6, (l.count - 1) * 2)
    const sz = base * RING_SCALE[rk]
    const name = pend ? set.flower : ripe ? set.ripe : set.variants ? set.variants[hashStr(l.id + 'v') % set.variants.length] : set.fruit
    const href = art(name)
    const FBn = (set.boxes && set.boxes[name]) || FB
    const H = sz, W = sz * FBn.aspect
    // 成串：第 2、3 顆果蒂接在旁邊一點的樹枝上，角度也不同；第 1 顆只有一點點歪
    const hv = hashStr(l.id + 't')
    const spread = SPREAD[rk] * p.side * sz * 0.8
    const px = p.x + spread
    const py = p.y + DROP[rk] * sz
    const tilt = (RING_TILT[rk] * p.side) + (hv % 9) - 4
    const bx = W * (0.5 - FBn.stem[0]), by = H * (0.5 - FBn.stem[1]) // 果實中心（相對於果蒂尖端）
    if (!set.noCover && !pend && hv % 3 === 0 && ring === 0) covers.push(`<ellipse cx="${f1(px - sz * 0.1)}" cy="${f1(py)}" rx="${f1(sz * 0.62)}" ry="${f1(sz * 0.4)}" fill="url(#cvg)"/>`)
    const cls = ['sf-leaf', pend ? 'sf-bud sf-artbud' : '', growIds.includes(l.id) ? 'sf-grow sf-artgrow' : '', flashIds.includes(l.id) ? 'sf-flash' : ''].join(' ')
    const img = pend && !(set.boxes && set.boxes[name])
      ? `<image class="sf-fruitimg" href="${href}" x="${f1(-sz * 0.5)}" y="${f1(-sz * 0.1)}" width="${f1(sz)}" height="${f1(sz)}"/>`
      : `<image class="sf-fruitimg" href="${href}" x="${f1(-W * FBn.stem[0])}" y="${f1(-H * FBn.stem[1])}" width="${f1(W)}" height="${f1(H)}"/>`
    const cx = pend && !(set.boxes && set.boxes[name]) ? 0 : bx, cy = pend && !(set.boxes && set.boxes[name]) ? sz * 0.4 : by
    return `<g class="${cls}" data-book="${l.id}" transform="translate(${f1(px)},${f1(py)}) rotate(${tilt})"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(sz * 0.6)}" fill="transparent"/>${ripe && !pend ? `<circle class="sf-glow" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(sz * 0.66)}" fill="url(#glow)"/>` : ''}<g class="sf-in"><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(sz * 0.42)}" fill="#FFF6D8" opacity=".3" filter="url(#blur3)"/>${img}</g></g>`
  }).join('') : ''
  // 前景葉片：把同一張樹圖疊在部分果實的「上緣」（最多三分之一），讓葉子和樹枝自然蓋住一點果實，果蒂像是從樹枝後面長出來
  const front = T.img && covers.length ? `<mask id="fcv" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="352"><radialGradient id="cvg"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>${covers.join('')}</mask><image href="${T.img.href}" x="${f1(T.img.x)}" y="${f1(T.img.y)}" width="${f1(T.img.w)}" height="${f1(T.img.h)}" preserveAspectRatio="none" mask="url(#fcv)" pointer-events="none"/>` : ''

  const lv = T.img ? fruitArt + front : placed.map(({ l, p, rot }) => {
    const c = catOf(l.cat)
    const tf = `translate(${f1(p.x)},${f1(p.y)}) rotate(${f1(rot)}) scale(${scale})`
    if (pendingIds.includes(l.id)) {
      // 花苞：等孩子澆水才長成葉子
      return `<g class="sf-leaf sf-bud" data-book="${l.id}" transform="${tf}"><circle r="14" cx="9" fill="transparent"/><path d="${sp.leaf}" fill="${c.color}" fill-opacity=".12" stroke="${c.color}" stroke-width="1.5" stroke-dasharray="3 2.5" transform="scale(.75)"/></g>`
    }
    const glow = l.count > 1
    const cls = ['sf-leaf', growIds.includes(l.id) ? 'sf-grow' : '', flashIds.includes(l.id) ? 'sf-flash' : ''].join(' ')
    return `<g class="${cls}" data-book="${l.id}" transform="${tf}">
      <circle r="14" cx="9" fill="transparent"/>
      ${glow ? '<circle class="sf-glow" cx="9" r="13" fill="url(#glow)"/>' : ''}
      <g class="sf-in"><path d="${sp.leaf}" fill="${c.color}" opacity=".9" filter="url(#wc)"/><path d="${sp.leaf}" fill="url(#t-hatch)" opacity=".5"/><path d="${sp.leaf}" fill="none" stroke="#4E3E30" stroke-opacity=".75" stroke-width="1.2" stroke-linejoin="round" filter="url(#cr)"/>
      <path d="M1.5,0 Q9,-.8 ${sp.structure === 'banana' ? 24 : 16},0" stroke="#5C5146" stroke-opacity=".28" stroke-width=".8" fill="none"/></g></g>`
  }).join('')

  const fruits = T.img ? '' : placed.filter(({ l }) => l.fruit && !pendingIds.includes(l.id)).map(({ l, p }) => {
    const fx = sp.structure === 'banana' ? T.top.x + ((hashStr(l.id) % 30) - 15) : p.x + 3
    const fy = sp.structure === 'banana' ? T.top.y + 14 + (hashStr(l.id + 'f') % 14) : p.y + 12
    return `<g class="sf-fruit${popIds.includes(l.id) ? ' sf-pop' : ''}" data-book="${l.id}"><circle cx="${f1(fx)}" cy="${f1(fy)}" r="11" fill="transparent"/><g filter="url(#crw)" transform="translate(${f1(fx)},${f1(fy)}) scale(1.18) translate(${f1(-fx)},${f1(-fy)})">${sp.fruit(Number(f1(fx)), Number(f1(fy)))}</g></g>`
  }).join('')

  const canopy = stage <= 1 ? [BASE_X + 40, BASE_Y - 70] : [T.top.x + 30, T.top.y + 10]
  // 樹下一次只來 2 隻動物（這個月的小動物＋英文訪客裡挑），才不會擠
  const critter = !shown || shown.includes('season') ? animal(season.animal, { trunkX: BASE_X, groundY: 336, canopy }) : ''
  // 英文書帶來的森林訪客，站在草地上
  const spots = stage <= 1 ? [112, 248, 140, 222, 98, 262] : stage === 2 ? [76, 284, 112, 250, 94, 268] : [42, 318, 92, 270, 20, 342]
  const guests = visitors.filter((v) => !shown || shown.includes(v.id)).slice(0, 6).map((v, i) => {
    const x = spots[i] + ((hashStr(v.id) % 9) - 4)
    const flip = x > BASE_X ? -1 : 1
    return `<g class="sf-visitor" data-visitor="${v.id}" transform="translate(${x},${334 + (i % 2) * 3}) scale(${flip * 0.95},0.95)" style="animation-delay:${(i * 0.7).toFixed(1)}s"><rect x="-26" y="-62" width="52" height="64" fill="transparent"/>${visitorSvg(v.animal)}</g>`
  }).join('')
  // 雜誌花圃：每讀一次雜誌，樹下就開一朵新的花（同一本雜誌同一個顏色）
  const MF = flowerOf(ym)
  const bedN = flowers.length
  const bed = ''
  const blooms = flowers.map((f, i) => {
    const [dx0, y] = BED[i % BED.length]
    const dx = dx0 * (stage <= 1 ? 0.62 : stage === 2 ? 0.82 : 1) // 樹小的時候畫面比較窄，花也靠近一點
    const extra = i >= BED.length ? (hashStr(f.id) % 11) - 5 : 0
    const x = BASE_X + dx + ((hashStr(f.id) % 5) - 2) + extra
    const col = MF.palette[hashStr(f.bookId + 'c') % MF.palette.length] // 同一本雜誌同一個顏色
    const c = col[0]
    const hv = hashStr(f.id + 'h')
    const h = 13 + (hv % 8) + (y > 346 ? 3 : 0)
    const r = 4.3 + (hv % 3) * 0.5
    const stem = `<path d="M0,0 C-1.5,-${(h * 0.4).toFixed(1)} 1.5,-${(h * 0.7).toFixed(1)} 0,-${h}" stroke="#7FA27F" stroke-width="1.5" fill="none"/>`
      + `<path d="M0,-${(h * 0.45).toFixed(1)} c4,-3 8,-2 9,1 c-4,2 -7,1 -9,-1z" fill="#8FB08A" transform="scale(${hv % 2 ? 1 : -1},1)"/>`
    let head
    if (MF.art) {
      // 媽媽畫的當月花：花苞／開花（圖裡已經有莖和葉子）
      const hh = (f.pending ? 26 : 32) + (hv % 6)
      const ww = hh * (f.pending ? 1.0 : 0.83)
      const cls2 = ['sf-flower', growIds.includes(f.id) ? 'sf-grow' : ''].join(' ')
      const fly2 = f.en && !f.pending ? `<g class="sf-float" transform="translate(10,-${hh + 6})"><g class="sf-flap"><ellipse cx="-2.4" rx="2.4" ry="3.2" fill="#9DC3D6"/><ellipse cx="2.4" rx="2.4" ry="3.2" fill="#9DC3D6"/></g></g>` : ''
      return { y, svg: `<g class="${cls2}" data-book="${f.bookId}" transform="translate(${f1(x)},${y})"><rect x="-${f1(ww / 2)}" y="-${hh}" width="${f1(ww)}" height="${hh}" fill="transparent"/><g class="sf-in${f.pending ? ' sf-fbud' : ''}"><image href="${art(f.pending ? MF.art.bud : MF.art.open)}" x="-${f1(ww / 2)}" y="-${hh}" width="${f1(ww)}" height="${hh}"/></g>${fly2}</g>` }
    }
    if (f.pending) head = `<ellipse class="sf-fbud" cy="-${h + 3}" rx="3" ry="4.5" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="1.2" stroke-dasharray="2 1.6"/>`
    else head = `<g transform="translate(0,-${(h + r).toFixed(1)})">${flowerHead(MF.kind, r * 1.35, col)}</g>`
    const fly = f.en && !f.pending ? `<g class="sf-float" transform="translate(9,-${h + 14})"><g class="sf-flap"><ellipse cx="-2.4" rx="2.4" ry="3.2" fill="#9DC3D6"/><ellipse cx="2.4" rx="2.4" ry="3.2" fill="#9DC3D6"/></g></g>` : ''
    const cls = ['sf-flower', growIds.includes(f.id) ? 'sf-grow' : ''].join(' ')
    return { y, svg: `<g class="${cls}" data-book="${f.bookId}" transform="translate(${f1(x)},${y})"><rect x="-8" y="-${h + r * 2 + 6}" width="16" height="${h + r * 2 + 8}" fill="transparent"/><g class="sf-in">${stem}${head}</g>${fly}</g>` }
  }).sort((p, q) => p.y - q.y).map((b) => b.svg).join('')
  // 收成的籃子：樹旁邊放一個，裡面有已收成的芭樂
  const basket = T.img && harvestedIds.length ? (() => {
    const bx = BASE_X + 108, by = 338
    const g = [[-15, -33, -16], [1, -35, 10], [-6, -30, -2]].map(([x, y, rt]) => `<image href="${art(set.fruit)}" x="${x}" y="${y}" width="17" height="21.6" transform="rotate(${rt} ${x + 8} ${y + 10})"/>`).join('')
    return `<g class="sf-basket" transform="translate(${bx},${by}) scale(1.35)"><ellipse cx="0" cy="1" rx="25" ry="4" fill="#3E3832" opacity=".14"/>${g}<path d="M-22,-18 L22,-18 L17,-1 Q0,3 -17,-1Z" fill="#CDA16A" stroke="#8A6A40" stroke-width="1.4" stroke-linejoin="round"/><path d="M-20,-12 H20 M-18,-6.5 H18 M-6,-18 L-7.5,-1 M6,-18 L7.5,-1" stroke="#A67B4A" stroke-width="1.1" fill="none" opacity=".8"/><path d="M-23,-18 H23" stroke="#8A6A40" stroke-width="2.6" stroke-linecap="round"/><circle cx="19" cy="-24" r="8.5" fill="#E2BE5A" stroke="#fff" stroke-width="1.5"/><text x="19" y="-21" text-anchor="middle" font-size="${harvestedIds.length > 99 ? 6.5 : 9}" font-weight="700" fill="#4A3F2E">${harvestedIds.length}</text></g>`
  })() : ''
  // 12 月：草地上蓋一層白雪（樹和花畫在雪的上面）
  const snowGround = month === 12 ? `<g filter="url(#blur3)"><path d="M4,334 Q40,324 82,331 T160,330 T244,331 T322,327 T356,333 L356,352 L4,352Z" fill="#C9DCE6" opacity=".8"/><path d="M4,332 Q40,322 82,329 T160,328 T244,329 T322,325 T356,331 L356,350 L4,350Z" fill="#fff" opacity=".92"/></g><g opacity=".9"><ellipse cx="70" cy="339" rx="26" ry="4" fill="#fff"/><ellipse cx="290" cy="340" rx="30" ry="4.5" fill="#fff"/><ellipse cx="180" cy="343" rx="40" ry="3.5" fill="#F2F7FA"/></g>` : ''
  const seedEl = stage === 0 ? `<ellipse cx="${BASE_X}" cy="326" rx="7" ry="4.5" fill="#98775F" opacity=".8" filter="url(#wc)"/>` : ''

  return `
    <defs>
      <filter id="wc" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/><feGaussianBlur stdDeviation=".35"/></filter>
      <filter id="wcT" x="-20%" y="-10%" width="140%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="3.2"/><feGaussianBlur stdDeviation=".5"/></filter>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      <filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="cr" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/><feTurbulence type="fractalNoise" baseFrequency="1.3" seed="11" result="g"/><feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.95" result="ga"/><feComposite in="d" in2="ga" operator="in"/></filter>
      <filter id="crw" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>
      <pattern id="t-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="3" stroke="#fff" stroke-width=".9" stroke-opacity=".55"/></pattern>
      <pattern id="t-grass" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="5" stroke="#86AE74" stroke-width="2.2" stroke-opacity=".55"/></pattern>
      <radialGradient id="glow"><stop offset="0" stop-color="#F6E3A4" stop-opacity=".95"/><stop offset="1" stop-color="#F6E3A4" stop-opacity="0"/></radialGradient>
      <radialGradient id="fruitShade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3E3832" stop-opacity=".22"/></radialGradient>
    </defs>
    <image href="${art('grass')}" x="4" y="321" width="352" height="46" preserveAspectRatio="none"/>${snowGround}
    ${wash}${T.img ? `<image href="${T.img.href}" x="${f1(T.img.x)}" y="${f1(T.img.y)}" width="${f1(T.img.w)}" height="${f1(T.img.h)}" preserveAspectRatio="none"/>` : `<g filter="url(#cr)">${brOut}</g><g filter="url(#wcT)">${br}${fronds}</g>`}${seedEl}${month === 12 ? '' : `<g filter="url(#cr)">${grass}</g>`}<g filter="url(#crw)">${groundFlowers}</g>${bed}${basket}
    <g>${lv}</g>${snowman}<g>${fruits}</g><g filter="url(#crw)">${blooms}</g>${critter}<g filter="url(#crw)">${guests}</g>`
}

const EMPTY = []
export default function ReadingTree({ childId, ym, speciesId, leaves, zoom, onPick, onVisitor, visitors = EMPTY, flowers = EMPTY, pendingIds = EMPTY, harvestedIds = EMPTY, hideIds = EMPTY, growIds = EMPTY, flashIds = EMPTY, popIds = EMPTY, mustShow = null, maxAnimals = 2, className = '' }) {
  // 每次打開隨機挑 2 隻動物；剛被英文書叫來的訪客一定出現
  const [luck] = useState(() => Math.random())
  const shown = useMemo(() => {
    const pool = ['season', ...visitors.map((v) => v.id)]
    if (pool.length <= maxAnimals) return null
    const order = pool.map((id) => ({ id, k: hashStr(id + luck) })).sort((a, b) => a.k - b.k).map((x) => x.id)
    const pick = mustShow && pool.includes(mustShow) ? [mustShow, ...order.filter((x) => x !== mustShow)] : order
    return pick.slice(0, maxAnimals)
  }, [visitors, luck, mustShow, maxAnimals])
  const svg = useMemo(
    () => renderTree({ seed: childId + '|' + ym + '|' + speciesId, ym, speciesId, leaves, pendingIds, harvestedIds, hideIds, growIds, flashIds, popIds, visitors, flowers, shown }),
    [childId, ym, speciesId, leaves, pendingIds, harvestedIds, hideIds, growIds, flashIds, popIds, visitors, flowers, shown]
  )
  const stage = stageOf(leaves.length)
  const vb = stage <= 1 ? '80 200 200 152' : stage === 2 ? '50 160 260 192' : '0 0 360 352'
  return (
    <div
      className={`sf-tree relative rounded-[18px] ${zoom ? 'overflow-x-auto' : 'overflow-hidden'} ${className || '-mx-2'}`}
      onClick={(e) => {
        const v = e.target.closest('[data-visitor]')
        if (v) return onVisitor?.(v.getAttribute('data-visitor'))
        const g = e.target.closest('[data-book]')
        if (g) onPick(g.getAttribute('data-book'), e)
      }}
    >
      <svg viewBox={vb} role="img" aria-label={`${leaves.length} 片故事葉`} className={`block h-auto ${zoom ? 'w-[175%] max-w-none' : 'w-full max-w-full'}`}
        dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
