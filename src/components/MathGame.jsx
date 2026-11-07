import { useEffect, useMemo, useRef, useState } from 'react'
import { art } from '../lib/art'
import { tick, boop, chime, unlockAudio } from '../lib/sound'

/*
  小動物加減法（原本叫書本加減法）
  - 每一題用同一種森林小動物（每題隨機換一種），數起來不混亂
  - 答案點「書堆」（旁邊小小寫數字），點下去會一本一本數
  - 難度：5 以內加法 → 5 以內加減 → 10 以內加法 → 10 以內加減（一輪答對 4 題以上就升一級，記在這台裝置）
  - 答錯不扣分：題目的書一本一本亮起來帶著數，再選一次
*/
const LEVELS = [
  { max: 5, ops: ['+'], name: '5 以內加法' },
  { max: 5, ops: ['+', '-'], name: '5 以內加減' },
  { max: 10, ops: ['+'], name: '10 以內加法' },
  { max: 10, ops: ['+', '-'], name: '10 以內加減' }
]
const PER_ROUND = 5
// 森林裡的小動物（媽媽畫的圖）；fly：減法時是飛走，其他是跑走
const ANIMALS = [
  { img: 'bunny', name: '小兔子' }, { img: 'frog', name: '小青蛙' }, { img: 'deer', name: '小鹿' },
  { img: 'hedgehog', name: '小刺蝟' }, { img: 'squirrel', name: '小松鼠' }, { img: 'fox', name: '小狐狸' },
  { img: 'bear', name: '小熊' }, { img: 'snail', name: '小蝸牛' },
  { img: 'sparrow', name: '小麻雀', fly: true }, { img: 'whiteeye', name: '綠繡眼', fly: true }
]
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

function makeQuestion(level, prev) {
  const L = LEVELS[level]
  let q
  for (let tries = 0; tries < 20; tries++) {
    const op = L.ops[ri(0, L.ops.length - 1)]
    let a, b, ans
    if (op === '+') { ans = ri(2, L.max); a = ri(1, ans - 1); b = ans - a } else { a = ri(2, L.max); b = ri(1, a - 1); ans = a - b }
    q = { op, a, b, ans }
    if (!prev || prev.a !== a || prev.b !== b || prev.op !== op) break
  }
  // 三個選項：正確答案＋旁邊的數字，由小到大排
  const near = [q.ans - 2, q.ans - 1, q.ans + 1, q.ans + 2].filter((n) => n >= 1 && n <= 10)
  const pick = []
  while (pick.length < 2 && near.length) pick.push(near.splice(ri(0, near.length - 1), 1)[0])
  q.choices = [q.ans, ...pick].sort((x, y) => x - y)
  const pool = ANIMALS.filter((a) => a.img !== prev?.animal.img)
  q.animal = pool[ri(0, pool.length - 1)]
  return q
}

function Books({ n, q, size = 'w-12', lit = -1, flying = 0, offset = 0 }) {
  const fly = q.animal.fly
  return (
    <div className="flex max-w-full flex-wrap items-end justify-center gap-x-1 gap-y-2">
      {Array.from({ length: n }, (_, i) => {
        const idx = i + offset
        const away = flying && i >= n - flying
        return (
          <div key={i} className={`relative ${size} shrink-0 ${away ? (fly ? 'sf-flyaway' : 'sf-runaway') : 'sf-critter'} ${lit >= idx ? 'sf-lit' : ''}`}
            style={{ animationDelay: away ? `${(i - (n - flying)) * 0.15}s` : `${(i % 3) * 0.25}s` }}>
            <img src={art(q.animal.img)} alt="" draggable="false" className="pointer-events-none block w-full select-none" />
            {away && !fly ? <span className="pointer-events-none absolute -left-3 bottom-0 text-lg">💨</span> : null}
            {lit >= idx && <span className="sf-countnum absolute -top-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-gold text-[12px] font-bold text-[#4A3F2E] shadow">{idx + 1}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function MathGame({ child, leaves, left, onUseRound, onClose }) {
  const lvKey = `sf-math-level-${child.id}`
  const [level, setLevel] = useState(() => { try { return Math.min(3, Number(localStorage.getItem(lvKey)) || 0) } catch { return 0 } })
  const [round, setRound] = useState(null) // { i, firstTry, q }
  const [phase, setPhase] = useState('ask') // ask | counting | right | wrong | done
  const [picked, setPicked] = useState(null)
  const [lit, setLit] = useState(-1) // 正在數到第幾本（選項的書堆）
  const [qLit, setQLit] = useState(-1) // 答錯時題目的書一起數
  const [flown, setFlown] = useState(false)
  const timers = useRef([])
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const q = round?.q
  // 減法：一開始全部的書都在，過一下子飛走幾本
  useEffect(() => {
    setFlown(false)
    if (q?.op === '-') later(() => setFlown(true), 900)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    unlockAudio()
    onUseRound()
    setRound({ i: 0, firstTry: 0, missed: false, q: makeQuestion(level) })
    setPhase('ask'); setPicked(null); setLit(-1); setQLit(-1)
  }

  function choose(n) {
    if (phase !== 'ask' && phase !== 'wrong') return
    setPicked(n); setPhase('counting'); setLit(-1)
    for (let k = 0; k < n; k++) later(() => { setLit(k); tick(k) }, 300 + k * 330)
    later(() => {
      if (n === q.ans) {
        chime(); navigator.vibrate?.(60)
        setPhase('right')
        setRound((r) => ({ ...r, firstTry: r.firstTry + (r.missed ? 0 : 1) }))
        later(next, 1700)
      } else {
        boop()
        setPhase('wrong')
        setRound((r) => ({ ...r, missed: true }))
        // 題目的書一本一本亮起來，帶著數
        const total = q.op === '+' ? q.a + q.b : q.a - q.b
        setQLit(-1)
        for (let k = 0; k < total; k++) later(() => { setQLit(k); tick(k) }, 600 + k * 380)
        later(() => { setPicked(null); setLit(-1) }, 600 + total * 380 + 500)
      }
    }, 300 + n * 330 + 250)
  }

  function next() {
    setRound((r) => {
      if (r.i + 1 >= PER_ROUND) { setPhase('done'); return r }
      setPhase('ask'); setPicked(null); setLit(-1); setQLit(-1)
      return { ...r, i: r.i + 1, missed: false, q: makeQuestion(level, r.q) }
    })
  }

  // 一輪結束：答對 4 題以上就升級
  const leveledUp = useMemo(() => phase === 'done' && round.firstTry >= 4 && level < 3, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!leveledUp) return
    const n = level + 1
    setLevel(n)
    try { localStorage.setItem(lvKey, String(n)) } catch { /* */ }
  }, [leveledUp]) // eslint-disable-line react-hooks/exhaustive-deps

  const pileSize = (n) => (n <= 2 ? 'w-12' : n <= 4 ? 'w-10' : n <= 6 ? 'w-8' : 'w-[26px]')
  const qSize = (n) => (n <= 2 ? 'w-20' : n <= 3 ? 'w-16' : n <= 4 ? 'w-14' : n <= 6 ? 'w-11' : 'w-9')
  const unit = '隻'

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#F3ECDA]" role="dialog" aria-label="小動物加減法"
      style={{ padding: 'calc(12px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}>
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col">
        <div className="flex items-center justify-between">
          <h2 className="h-hand text-2xl">🐰 小動物加減法</h2>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-paper text-2xl shadow" onClick={onClose} aria-label="回到遊戲選單">🎮</button>
        </div>

        {!round ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="flex items-end gap-2 text-4xl font-bold text-sage-deep">
              <img src={art('bunny')} alt="" className="w-16" />＋<img src={art('bunny')} alt="" className="w-16" /><span className="pb-3">＝ ?</span>
            </div>
            <p className="h-hand text-2xl leading-snug">森林的小動物來玩了！<br />數一數，點對的那一群</p>
            <p className="text-sm text-ink-soft">現在是「{LEVELS[level].name}」　今天還可以玩 {left} 輪</p>
            {left > 0
              ? <button className="btn px-10 py-4 text-xl" onClick={start}>開始 ▶</button>
              : <p className="h-hand text-xl">今天的遊戲玩完了，<br />再讀一本書就能再玩 🌙</p>}
          </div>
        ) : phase === 'done' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">{round.firstTry >= 4 ? '🎉' : '🌟'}</div>
            <p className="h-hand text-3xl">一次就答對 {round.firstTry} 題！</p>
            <div className="text-3xl tracking-widest">{Array.from({ length: PER_ROUND }, (_, i) => (i < round.firstTry ? '⭐' : '☆')).join('')}</div>
            {leveledUp && <p className="rounded-full bg-paper-card px-4 py-1.5 font-bold text-sage-deep shadow">升級了！下一輪是「{LEVELS[level].name}」</p>}
            <div className="mt-2 flex gap-3">
              <button className="btn-ghost px-6 py-3" onClick={onClose}>回到選單</button>
              {left > 0 && <button className="btn px-6 py-3" onClick={start}>再玩一輪</button>}
            </div>
            {round.firstTry >= 4 && (
              <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => <span key={i} className="sf-confetti" style={{ left: `${(i * 7.3) % 96}%`, animationDelay: `${(i % 6) * 0.15}s`, background: ['#C88F99', '#D6B65E', '#83A48A', '#8EAEBB', '#AD9DBD'][i % 5] }} />)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-2 flex justify-center gap-1.5">{Array.from({ length: PER_ROUND }, (_, i) => <i key={i} className={`h-2.5 w-2.5 rounded-full ${i < round.i ? 'bg-sage' : i === round.i ? 'bg-gold' : 'bg-line'}`} />)}</div>

            {/* 題目 */}
            <div key={round.i} className="sf-qin my-auto rounded-[28px] bg-paper-card px-3 py-6 shadow-sm">
              {q.op === '+' ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1"><Books n={q.a} q={q} lit={qLit} size={qSize(Math.max(q.a, q.b))} /></div>
                  <span className="text-4xl font-bold text-sage-deep">＋</span>
                  <div className="flex-1"><Books n={q.b} q={q} lit={qLit} offset={q.a} size={qSize(Math.max(q.a, q.b))} /></div>
                </div>
              ) : (
                <Books n={q.a} q={q} lit={qLit} flying={flown ? q.b : 0} size={q.a <= 3 ? 'w-[72px]' : q.a <= 6 ? 'w-14' : 'w-11'} />
              )}
              <p className="h-hand mt-4 text-center text-[22px] leading-snug">
                {q.op === '+' ? <>{q.a} 隻{q.animal.name}，又來了 {q.b} 隻，<br />一共有幾隻？</>
                  : flown ? <>{q.animal.fly ? '飛' : '跑'}走了 {q.b} 隻，<br />還剩幾隻？</> : <>這裡有 {q.a} 隻{q.animal.name}…</>}
              </p>
            </div>

            {/* 選項：三堆書 */}
            <div className={`grid grid-cols-3 gap-2.5 pb-2 ${q.op === '-' && !flown ? 'pointer-events-none opacity-40' : ''}`}>
              {q.choices.map((n) => {
                const mine = picked === n
                const state = mine && phase === 'right' ? 'border-sage bg-sage-mist' : mine && phase === 'wrong' ? 'sf-shake border-[#D9A08F] bg-[#F8ECE8]' : 'border-line bg-paper-card'
                return (
                  <button key={n} onClick={() => choose(n)} aria-label={`${n} ${unit}`}
                    className={`flex min-h-[150px] flex-col items-center justify-between rounded-3xl border-[3px] px-1.5 pb-2 pt-3 shadow-[0_4px_0_#E2D3B0] transition active:translate-y-0.5 ${state}`}>
                    <Books n={n} q={q} size={pileSize(n)} lit={mine ? lit : -1} />
                    <span className="mt-2 text-sm font-bold text-ink-soft">{n}</span>
                  </button>
                )
              })}
            </div>
            {phase === 'right' && <p className="sf-qin pb-2 text-center font-hand text-2xl font-bold text-sage-deep">答對了！🎉</p>}
            {phase === 'wrong' && <p className="pb-2 text-center font-hand text-xl font-bold text-bark">我們一起數一數 👆</p>}
          </>
        )}
      </div>
    </div>
  )
}
