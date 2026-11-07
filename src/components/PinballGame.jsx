import { useEffect, useRef, useState } from 'react'
import { art } from '../lib/art'
import { tick, chime, boop, unlockAudio } from '../lib/sound'

/*
  森林彈珠台（古早味彈珠台）
  - 按一下大大的「發射」就射出去（按久一點會飛高一點），一定射得出去
  - 彈珠撞著小蘑菇和小動物一路掉下來：撞到小動物 +10 分
  - 最下面 5 個格子有不同分數，中間最高
  - 一輪 10 顆彈珠，最後看得到幾分（記住最高分）
*/
const W = 320
const H = 520
const R = 7 // 彈珠半徑
const FIELD_R = 280 // 右邊發射道的牆
const ARC = { x: 160, y: 168, r: 152 } // 上面的圓弧
const SLOT_TOP = 438
const SLOTS = 5
const BALLS = 10
const SCORES = [10, 30, 100, 30, 10] // 格子的分數
const HIT = 10 // 撞到小動物
const G = 0.22

// 小蘑菇（釘子）
function makePins() {
  const pins = []
  for (let row = 0; row < 7; row++) {
    const y = 196 + row * 34
    const odd = row % 2
    for (let k = 0; k < 7; k++) {
      const x = 34 + k * 38 + (odd ? 19 : 0)
      if (x > FIELD_R - 18) continue
      pins.push({ x, y, r: 5 })
    }
  }
  return pins
}
// 小動物彈跳墊（撞到會彈很遠）
const BUMPERS = [
  { x: 92, y: 132, r: 16, img: 'frog' },
  { x: 214, y: 128, r: 16, img: 'bunny' },
  { x: 154, y: 96, r: 14, img: 'hedgehog' }
]

export default function PinballGame({ leaves, left, onUseRound, onClose }) {
  const canvasRef = useRef(null)
  const st = useRef(null)
  const [started, setStarted] = useState(false)
  const [ballsLeft, setBallsLeft] = useState(BALLS)
  const [power, setPower] = useState(0)
  const [flying, setFlying] = useState(false)
  const [score, setScore] = useState(0)
  const [pops, setPops] = useState([]) // 飄起來的「+10」
  const bestKey = 'sf-pinball-best'
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem(bestKey)) || 0 } catch { return 0 } })
  const scoreRef = useRef(0)
  function addScore(pts, x, y, big) {
    scoreRef.current += pts
    setScore(scoreRef.current)
    const key = Math.random()
    setPops((ps) => [...ps.slice(-5), { key, pts, x, y, big }])
    setTimeout(() => setPops((ps) => ps.filter((q) => q.key !== key)), 1100)
  }
  const [done, setDone] = useState(false)


  function newRound() {
    unlockAudio()
    onUseRound()
    scoreRef.current = 0
    setScore(0); setPops([]); setBallsLeft(BALLS); setDone(false); setStarted(true)
  }

  // ---- 畫面與物理 ----
  useEffect(() => {
    if (!started) return
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = W * dpr; cv.height = H * dpr
    ctx.scale(dpr, dpr)
    const imgs = {}
    BUMPERS.forEach((b) => { const im = new Image(); im.src = art(b.img); imgs[b.img] = im })
    const s = { ball: null, pins: makePins(), hits: new Map(), raf: 0, still: 0 }
    st.current = s

    const slotW = (FIELD_R - 8) / SLOTS
    function landed(slot) {
      chime(); navigator.vibrate?.(60)
      addScore(SCORES[slot], 8 + (slot + 0.5) * slotW, SLOT_TOP - 20, true)
      s.ball = null
      setFlying(false)
      setBallsLeft((n) => {
        if (n <= 0) setTimeout(() => {
          setDone(true)
          setBest((b) => { const nb = Math.max(b, scoreRef.current); try { localStorage.setItem(bestKey, String(nb)) } catch { /* */ } return nb })
        }, 1400)
        return n
      })
    }

    function step() {
      const b = s.ball
      if (b) {
        for (let sub = 0; sub < 2; sub++) {
          b.vy += G / 2
          b.x += b.vx / 2; b.y += b.vy / 2
          const inLane = b.x > FIELD_R && b.y > 120
          if (inLane) {
            if (b.x < FIELD_R + R + 2) { b.x = FIELD_R + R + 2; b.vx = Math.abs(b.vx) * 0.5 }
            if (b.x > W - R - 6) { b.x = W - R - 6; b.vx = -Math.abs(b.vx) * 0.5 }
            if (b.y > H - 30 && b.vy > 0) { // 掉回發射處：這顆不算，再拉一次
              s.ball = null; setFlying(false); setBallsLeft((n) => n + 1); break
            }
          } else {
            // 上面的圓弧
            if (b.y < ARC.y) {
              const dx = b.x - ARC.x, dy = b.y - ARC.y, d = Math.hypot(dx, dy)
              if (d > ARC.r - R) {
                const nx = dx / d, ny = dy / d
                b.x = ARC.x + nx * (ARC.r - R); b.y = ARC.y + ny * (ARC.r - R)
                const dot = b.vx * nx + b.vy * ny
                if (dot > 0) { b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny }
              }
            }
            // 左右牆
            if (b.x < 8 + R) { b.x = 8 + R; b.vx = Math.abs(b.vx) * 0.6 }
            if (b.x > FIELD_R - R && b.y > 120) { b.x = FIELD_R - R; b.vx = -Math.abs(b.vx) * 0.6 }
            // 蘑菇和動物
            for (const p of [...s.pins, ...BUMPERS]) {
              const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), m = p.r + R
              if (d < m && d > 0) {
                const nx = dx / d, ny = dy / d
                b.x = p.x + nx * m; b.y = p.y + ny * m
                const dot = b.vx * nx + b.vy * ny
                const bump = p.img ? 1.9 : 1.45
                if (dot < 0) { b.vx -= bump * dot * nx; b.vy -= bump * dot * ny }
                if (p.img) { b.vx += nx * 2.2; b.vy += ny * 2.2; if (!s.hits.get(p)) addScore(HIT, p.x, p.y - p.r - 6); s.hits.set(p, 12); if (sub === 0) tick(8) }
                else { b.vx += (Math.random() - 0.5) * 0.4; s.hits.set(p, 8); if (sub === 0 && Math.random() < 0.5) tick(Math.floor(p.y / 40)) }
              }
            }
            // 格子之間的隔板
            if (b.y > SLOT_TOP - R) {
              for (let k = 1; k < SLOTS; k++) {
                const x = 8 + k * slotW
                if (Math.abs(b.x - x) < R + 2) { b.x = b.x < x ? x - R - 2 : x + R + 2; b.vx = -b.vx * 0.4 }
              }
            }
            // 底部：掉進格子
            if (b.y > H - 14 - R) {
              b.y = H - 14 - R; b.vy = -Math.abs(b.vy) * 0.25; b.vx *= 0.7
              if (Math.abs(b.vy) < 1.2) { landed(Math.max(0, Math.min(SLOTS - 1, Math.floor((b.x - 8) / slotW)))); break }
            }
          }
          // 速度上限
          const sp = Math.hypot(b.vx, b.vy)
          if (sp > 15) { b.vx *= 15 / sp; b.vy *= 15 / sp }
        }
        // 卡住了就輕輕推一下
        if (s.ball && Math.hypot(b.vx, b.vy) < 0.15 && !(b.x > FIELD_R)) { s.still++; if (s.still > 60) { b.vx = (Math.random() - 0.5) * 3; b.vy = -1; s.still = 0 } } else s.still = 0
      }
      draw()
      s.raf = requestAnimationFrame(step)
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // 底板
      ctx.fillStyle = '#EAF2E3'
      ctx.beginPath(); ctx.moveTo(4, H - 4); ctx.lineTo(4, ARC.y); ctx.arc(ARC.x, ARC.y, ARC.r + 4, Math.PI, 0); ctx.lineTo(W - 4, H - 4); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#B9946F'; ctx.lineWidth = 6; ctx.stroke()
      // 發射道
      ctx.strokeStyle = '#C9A981'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.moveTo(FIELD_R + 1, 120); ctx.lineTo(FIELD_R + 1, H - 6); ctx.stroke()
      // 小動物
      BUMPERS.forEach((p) => {
        const h = s.hits.get(p) || 0
        const sc = 1 + h * 0.03
        ctx.fillStyle = h ? '#F6E3A4' : '#F3ECDA'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * sc, 0, Math.PI * 2); ctx.fill()
        const im = imgs[p.img]
        if (im?.complete && im.naturalWidth) { const z = p.r * 2.4 * sc; ctx.drawImage(im, p.x - z / 2, p.y - z / 2 - 2, z, z) }
        if (h) s.hits.set(p, h - 1)
      })
      // 蘑菇
      s.pins.forEach((p) => {
        const h = s.hits.get(p) || 0
        ctx.fillStyle = '#F4EFE3'; ctx.fillRect(p.x - 2, p.y, 4, 5)
        ctx.fillStyle = h ? '#F2D35B' : '#D9776B'
        ctx.beginPath(); ctx.arc(p.x, p.y + 1, p.r + (h ? 1.5 : 0), Math.PI, 0); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 1.5, 1.1, 0, Math.PI * 2); ctx.fill()
        if (h) s.hits.set(p, h - 1)
      })
      // 格子
      ctx.strokeStyle = '#B9946F'; ctx.lineWidth = 3
      for (let k = 1; k < SLOTS; k++) { const x = 8 + k * slotW; ctx.beginPath(); ctx.moveTo(x, SLOT_TOP); ctx.lineTo(x, H - 6); ctx.stroke() }
      // 彈珠
      const b = s.ball
      if (b) {
        const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, R)
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.5, '#B7D3E0'); g.addColorStop(1, '#6F95AA')
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill()
      }
    }
    s.raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(s.raf)
  }, [started]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 發射：按一下就射；按久一點（最多 1.2 秒）飛得更高。一定射得出去 ----
  const charge = useRef(null)
  function pullDown(e) {
    e.preventDefault()
    if (!st.current || st.current.ball || ballsLeft <= 0 || done || charge.current) return
    unlockAudio()
    const t0 = performance.now()
    const loop = (t) => {
      const v = Math.min(1, (t - t0) / 1200)
      setPower(v)
      if (charge.current) charge.current.v = v
      if (charge.current) charge.current.raf = requestAnimationFrame(loop)
    }
    charge.current = { raf: requestAnimationFrame(loop), v: 0 }
  }
  function release() {
    const c = charge.current
    if (!c) return
    cancelAnimationFrame(c.raf)
    charge.current = null
    setPower(0)
    const s = st.current
    if (!s || s.ball) return
    // 最小力氣也能繞過上面的圓弧，再加一點隨機，每次落點不一樣
    const v = 0.45 + c.v * 0.55 + Math.random() * 0.08
    s.ball = { x: W - 18, y: H - 34, vx: 0, vy: -(10.5 + v * 6) }
    setFlying(true)
    setBallsLeft((n) => n - 1)
    tick(0)
  }
  useEffect(() => () => { if (charge.current) cancelAnimationFrame(charge.current.raf) }, [])


  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#F3ECDA]" role="dialog" aria-label="森林彈珠台"
      style={{ padding: 'calc(10px + env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))' }}>
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col">
        <div className="flex items-center justify-between">
          <h2 className="h-hand text-2xl">🎯 森林彈珠台</h2>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-paper text-2xl shadow" onClick={onClose} aria-label="回到遊戲選單">🎮</button>
        </div>

        {!started ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="text-7xl">🎯</div>
            <p className="h-hand text-2xl leading-snug">按「發射」把彈珠射出去！<br />撞到小動物、掉進中間，分數最高</p>
            <p className="text-sm text-ink-soft">一輪有 {BALLS} 顆彈珠　今天還可以玩 {left} 輪</p>
            {left > 0
              ? <button className="btn px-10 py-4 text-xl" onClick={newRound}>開始 ▶</button>
              : <p className="h-hand text-xl">今天的遊戲玩完了，<br />再讀一本書就能再玩 🌙</p>}
          </div>
        ) : (
          <>
            <div className="mt-1 flex items-center justify-between px-1 text-sm">
              <span className="font-bold text-ink-soft">還可以射 <b className="text-xl text-sage-deep">{ballsLeft}</b> 次
                <span className="ml-1 inline-flex gap-0.5 align-middle">{Array.from({ length: BALLS }, (_, i) => <i key={i} className={`inline-block h-2 w-2 rounded-full ${i < ballsLeft ? 'bg-[#6F95AA]' : 'bg-line'}`} />)}</span></span>
              <span className="h-hand text-2xl font-bold text-bark">{score} 分</span>
            </div>
            <div className="relative mx-auto mt-1 w-full flex-1" style={{ maxWidth: `min(100%, calc((100dvh - 230px) * ${W / H}))` }}>
              <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                {/* 格子的分數 */}
                <div className="pointer-events-none absolute flex" style={{ left: `${(8 / W) * 100}%`, width: `${((FIELD_R - 8) / W) * 100}%`, top: `${((SLOT_TOP + 8) / H) * 100}%`, bottom: '3%' }}>
                  {SCORES.map((n, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center justify-end pb-1">
                      <span className={`font-hand font-bold leading-none ${n >= 100 ? 'text-[22px] text-[#C9852E]' : 'text-lg text-bark'}`}>{n}</span>
                      <span className="text-[10px] text-ink-soft">分</span>
                    </div>
                  ))}
                </div>
                {/* 飄起來的分數 */}
                {pops.map((q) => (
                  <span key={q.key} className={`sf-scorepop pointer-events-none absolute -translate-x-1/2 font-hand font-bold ${q.big ? 'text-3xl text-[#C9852E]' : 'text-lg text-sage-deep'}`}
                    style={{ left: `${(q.x / W) * 100}%`, top: `${(q.y / H) * 100}%` }}>+{q.pts}</span>
                ))}
                {/* 拉桿 */}
                <button aria-label="拉桿：按一下發射" onPointerDown={pullDown} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onContextMenu={(e) => e.preventDefault()}
                  disabled={flying || ballsLeft <= 0}
                  className="absolute touch-none select-none" style={{ left: `${((FIELD_R + 2) / W) * 100}%`, right: '1%', bottom: '1%', height: '30%' }}>
                  <span className="absolute inset-x-[18%] bottom-0 rounded-t-full bg-[#D6B65E] shadow-inner" style={{ top: `${10 + power * 60}%` }} />
                  <span className="absolute inset-x-[30%] rounded-full bg-[#8A5A3C]" style={{ top: `${power * 60}%`, height: '10%' }} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              {!done && !flying && ballsLeft > 0 && (
                <button onPointerDown={pullDown} onPointerUp={release} onPointerLeave={release} onPointerCancel={release} onContextMenu={(e) => e.preventDefault()}
                  className="relative h-16 w-full max-w-[260px] touch-none select-none overflow-hidden rounded-full bg-[#C9852E] text-2xl font-bold text-white shadow-[0_5px_0_#9C6420] active:translate-y-1 active:shadow-none">
                  <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${power * 100}%` }} />
                  <span className="relative font-hand">🚀 發射！</span>
                </button>
              )}
              {done ? null : flying ? <p className="h-hand text-lg text-ink-soft">彈珠跑跑跑…</p>
                : null}
            </div>
          </>
        )}

        {done && (
          <div className="fixed inset-0 z-[66] grid place-items-center bg-[#2E3A52]/50 p-6">
            <div className="sf-unlock w-full max-w-[340px] rounded-[32px] bg-paper px-5 pb-5 pt-6 text-center shadow-xl">
              <p className="text-5xl">{score >= best && score > 0 ? '🏆' : '🎉'}</p>
              <p className="h-hand mt-1 text-xl">這一輪得到</p>
              <p className="h-hand text-5xl font-bold text-[#C9852E]">{score} 分</p>
              <p className="mt-2 text-sm text-ink-soft">{score >= best && score > 0 ? '新的最高分！' : `最高分：${best} 分`}</p>
              <div className="mt-4 flex justify-center gap-3">
                <button className="btn-ghost px-5 py-3" onClick={onClose}>回到選單</button>
                {left > 0 && <button className="btn px-5 py-3" onClick={newRound}>再玩一輪</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
