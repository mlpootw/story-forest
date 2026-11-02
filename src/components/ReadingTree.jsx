import { useMemo } from 'react'
import { SPECIES, SEASONS, groundFlower, animal } from '../lib/trees'
import { catOf } from '../lib/books'
import { visitorSvg } from '../lib/visitors'

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

/* ---------- 組合成 SVG ---------- */
function renderTree({ seed, ym, speciesId, leaves, pendingIds = [], growIds = [], flashIds = [], popIds = [], visitors = [] }) {
  const sp = SPECIES[speciesId] || SPECIES.guava
  const n = leaves.length
  const stage = stageOf(n)
  const T = sp.structure === 'banana' ? buildBanana(seed, stage) : buildBranchy(seed, stage, sp)
  const r = rng(hashStr('d' + seed))
  const month = Number(ym.slice(5, 7))
  const season = SEASONS[month]

  // 葉子位置：依書的編號決定，重新整理也不會變
  const used = new Set()
  const A = T.anchors.length ? T.anchors : [{ x: BASE_X, y: BASE_Y - 30, a: -60 }]
  const scale = (n > 30 ? 0.95 : n > 20 ? 1.1 : 1.35) * sp.leafScale
  const placed = leaves.map((l, idx) => {
    let i = hashStr(l.id + ym) % A.length
    let g = 0
    while (used.has(i) && g < A.length) { i = (i + 7) % A.length; g++ }
    used.add(i)
    const base = A[i]
    const over = g >= A.length ? idx : 0
    const p = over ? { x: base.x + ((hashStr(l.id) % 13) - 6), y: base.y + ((hashStr(l.id + 'y') % 13) - 6), a: base.a } : base
    const rot = sp.structure === 'banana' ? p.a : (hashStr(l.id) % 360) - 180
    return { l, p, rot }
  })

  const wash = stage >= 3 ? `<g filter="url(#blur)">${Array.from({ length: 5 }, () => `<circle cx="${f1(T.top.x + (r() - 0.5) * 170)}" cy="${f1((T.top.y + BASE_Y) / 2 - 30 + (r() - 0.5) * 90)}" r="${f1(40 + r() * 40)}" fill="#83A48A" opacity=".1"/>`).join('')}</g>` : ''
  const br = T.branches.map((b) => `<path d="${b.d}" stroke="${sp.trunk}" stroke-width="${b.w}" stroke-linecap="round" fill="none" opacity=".9"/><path d="${b.d}" stroke="#D2BDA6" stroke-width="${f1(b.w * 0.32)}" stroke-linecap="round" fill="none" opacity=".45" transform="translate(-${f1(b.w * 0.18)},0)"/>`).join('')
  const fronds = (T.fronds || []).map((d) => `<path d="${d}" stroke="#A9BE8E" stroke-width="${stage >= 3 ? 9 : 6}" stroke-linecap="round" fill="none" opacity=".55"/><path d="${d}" stroke="#8FA676" stroke-width="1.2" fill="none" opacity=".8"/>`).join('')

  let grass = ''
  for (let i = 0; i < 26; i++) {
    const x = 40 + r() * 280
    const h = 6 + r() * 10
    grass += `<path d="M${f1(x)},336 q${f1(r() * 4 - 2)},-${f1(h / 2)} ${f1(r() * 6 - 3)},-${f1(h)}" stroke="#83A48A" stroke-width="1.2" fill="none" opacity=".7" stroke-linecap="round"/>`
  }
  let flowers = ''
  const fr = rng(hashStr('f' + ym))
  const fallenLike = season.flower === 'fallen' || season.flower === 'maple'
  for (let i = 0; i < (fallenLike ? 9 : 6); i++) flowers += groundFlower(season.flower, 60 + fr() * 240, 334 + fr() * 6, fr())

  const lv = placed.map(({ l, p, rot }) => {
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
      <g class="sf-in"><path d="${sp.leaf}" fill="${c.color}" opacity=".92" filter="url(#wc)"/>
      <path d="M1.5,0 Q9,-.8 ${sp.structure === 'banana' ? 24 : 16},0" stroke="#5C5146" stroke-opacity=".28" stroke-width=".8" fill="none"/></g></g>`
  }).join('')

  const fruits = placed.filter(({ l }) => l.fruit && !pendingIds.includes(l.id)).map(({ l, p }) => {
    const fx = sp.structure === 'banana' ? T.top.x + ((hashStr(l.id) % 30) - 15) : p.x + 3
    const fy = sp.structure === 'banana' ? T.top.y + 14 + (hashStr(l.id + 'f') % 14) : p.y + 12
    return `<g class="sf-fruit${popIds.includes(l.id) ? ' sf-pop' : ''}" data-book="${l.id}"><circle cx="${f1(fx)}" cy="${f1(fy)}" r="11" fill="transparent"/>${sp.fruit(Number(f1(fx)), Number(f1(fy)))}</g>`
  }).join('')

  const canopy = stage <= 1 ? [BASE_X + 40, BASE_Y - 70] : [T.top.x + 30, T.top.y + 10]
  const critter = animal(season.animal, { trunkX: BASE_X, groundY: 336, canopy })
  // 英文書帶來的森林訪客，站在草地上
  const spots = stage <= 1 ? [104, 256, 126, 234, 92, 268] : stage === 2 ? [70, 290, 100, 262, 84, 276] : [58, 304, 96, 268, 34, 326]
  const guests = visitors.slice(0, 6).map((v, i) => {
    const x = spots[i] + ((hashStr(v.id) % 9) - 4)
    const flip = x > BASE_X ? -1 : 1
    return `<g class="sf-visitor" data-visitor="${v.id}" transform="translate(${x},${334 + (i % 2) * 3}) scale(${flip * 0.95},0.95)" style="animation-delay:${(i * 0.7).toFixed(1)}s"><rect x="-14" y="-30" width="28" height="32" fill="transparent"/>${visitorSvg(v.animal)}</g>`
  }).join('')
  const seedEl = stage === 0 ? `<ellipse cx="${BASE_X}" cy="326" rx="7" ry="4.5" fill="#98775F" opacity=".8" filter="url(#wc)"/>` : ''

  return `
    <defs>
      <filter id="wc" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.6"/><feGaussianBlur stdDeviation=".35"/></filter>
      <filter id="wcT" x="-20%" y="-10%" width="140%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="3.2"/><feGaussianBlur stdDeviation=".5"/></filter>
      <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
      <radialGradient id="glow"><stop offset="0" stop-color="#F6E3A4" stop-opacity=".95"/><stop offset="1" stop-color="#F6E3A4" stop-opacity="0"/></radialGradient>
      <radialGradient id="fruitShade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3E3832" stop-opacity=".22"/></radialGradient>
    </defs>
    <ellipse cx="180" cy="338" rx="150" ry="13" fill="#A5B6A0" opacity=".4" filter="url(#wcT)"/>
    <ellipse cx="170" cy="337" rx="96" ry="7" fill="#83A48A" opacity=".25" filter="url(#wcT)"/>
    ${wash}<g filter="url(#wcT)">${br}${fronds}</g>${seedEl}${grass}${flowers}
    <g>${lv}</g><g>${fruits}</g>${critter}${guests}`
}

const EMPTY = []
export default function ReadingTree({ childId, ym, speciesId, leaves, zoom, onPick, onVisitor, visitors = EMPTY, pendingIds = EMPTY, growIds = EMPTY, flashIds = EMPTY, popIds = EMPTY, className = '' }) {
  const svg = useMemo(
    () => renderTree({ seed: childId + '|' + ym + '|' + speciesId, ym, speciesId, leaves, pendingIds, growIds, flashIds, popIds, visitors }),
    [childId, ym, speciesId, leaves, pendingIds, growIds, flashIds, popIds, visitors]
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
        if (g) onPick(g.getAttribute('data-book'))
      }}
    >
      <svg viewBox={vb} role="img" aria-label={`${leaves.length} 片故事葉`} className={`block h-auto ${zoom ? 'w-[175%] max-w-none' : 'w-full max-w-full'}`}
        dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}
