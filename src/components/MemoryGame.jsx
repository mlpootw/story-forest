import { useEffect, useState } from 'react'
import Cover from './Cover'

/*
  封面翻翻樂
  - 用這個月已經長出葉子的書做卡片（2～4 組）
  - 沒有分數、沒有計時；全部配對完成就放煙火
  - 輪數：今天每讀一本書（澆完水）可以玩 3 輪，所有遊戲共用（由遊戲選單管理）
*/

function shuffle(a) {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}

export default function MemoryGame({ leaves, left, onUseRound, onClose }) {

  const [cards, setCards] = useState(null)
  const [open, setOpen] = useState([])
  const [done, setDone] = useState([])
  const [lock, setLock] = useState(false)

  function start() {
    const pool = shuffle(leaves).slice(0, Math.min(4, leaves.length))
    setCards(shuffle(pool.flatMap((l) => [{ uid: l.id + 'a', id: l.id, leaf: l }, { uid: l.id + 'b', id: l.id, leaf: l }])))
    setOpen([]); setDone([])
    onUseRound()
  }

  function flip(c) {
    if (lock || open.includes(c.uid) || done.includes(c.id)) return
    const next = [...open, c.uid]
    setOpen(next)
    if (next.length === 2) {
      const [a, b] = next.map((u) => cards.find((x) => x.uid === u))
      if (a.id === b.id) {
        setTimeout(() => { setDone((d) => [...d, a.id]); setOpen([]) }, 450)
      } else {
        setLock(true)
        setTimeout(() => { setOpen([]); setLock(false) }, 1100)
      }
    }
  }

  const finished = cards && done.length === cards.length / 2
  useEffect(() => { if (finished) navigator.vibrate?.(80) }, [finished])
  const cols = cards && cards.length <= 4 ? 'grid-cols-2' : cards && cards.length <= 6 ? 'grid-cols-3' : 'grid-cols-4'

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#F3ECDA]" role="dialog" aria-label="封面翻翻樂"
      style={{ padding: 'calc(12px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}>
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col">
        <div className="flex items-center justify-between">
          <h2 className="h-hand text-2xl">🃏 封面翻翻樂</h2>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-paper text-2xl shadow" onClick={onClose} aria-label="回到遊戲選單">🎮</button>
        </div>

        {!cards ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            {leaves.length < 2 ? (
              <>
                <div className="text-7xl">📚</div>
                <p className="h-hand text-2xl leading-snug">再讀一本書<br />就可以玩翻翻樂囉！</p>
                <p className="text-sm text-ink-soft">樹上要有 2 片以上的故事葉才能玩</p>
              </>
            ) : left === 0 ? (
              <>
                <div className="text-7xl">🌙</div>
                <p className="h-hand text-2xl leading-snug">今天的遊戲玩完了<br />再讀一本書，就能再玩 3 輪</p>
              </>
            ) : (
              <>
                <div className="flex gap-2">{leaves.slice(0, 3).map((l) => <div key={l.id} className="w-16 rotate-[-4deg] odd:rotate-[5deg]"><Cover book={l.book} categoryId={l.cat} size="xs" /></div>)}</div>
                <p className="h-hand text-2xl leading-snug">找出一樣的封面！</p>
                <p className="text-sm text-ink-soft">今天還可以玩 {left} 輪</p>
                <button className="btn px-10 py-4 text-xl" onClick={start}>開始 ▶</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className={`mt-4 grid flex-1 content-center gap-3 ${cols}`}>
              {cards.map((c) => {
                const up = open.includes(c.uid) || done.includes(c.id)
                return (
                  <button key={c.uid} onClick={() => flip(c)} aria-label={up ? c.leaf.book.title : '蓋著的卡片'}
                    className={`sf-card relative aspect-[3/4] w-full ${up ? 'is-up' : ''} ${done.includes(c.id) ? 'is-done' : ''}`}>
                    <span className="sf-card-face sf-card-back grid place-items-center rounded-2xl bg-sage text-4xl shadow-[0_4px_0_#5F8468]">🍃</span>
                    <span className="sf-card-face sf-card-front overflow-hidden rounded-2xl bg-paper p-1 shadow"><Cover book={c.leaf.book} categoryId={c.leaf.cat} size="sm" /></span>
                  </button>
                )
              })}
            </div>
            {finished && (
              <div className="mt-4 text-center">
                <p className="h-hand text-2xl">🎉 全部找到了！</p>
                <p className="mt-1 text-sm text-ink-soft">還記得這些故事在講什麼嗎？跟爸爸媽媽說說看</p>
                <div className="mt-3 flex justify-center gap-3">
                  <button className="btn-ghost px-6 py-3" onClick={onClose}>回到選單 🎮</button>
                  {left > 0 && <button className="btn px-6 py-3" onClick={start}>再玩一輪</button>}
                </div>
                <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                  {Array.from({ length: 14 }, (_, i) => <span key={i} className="sf-confetti" style={{ left: `${(i * 7.3) % 96}%`, animationDelay: `${(i % 6) * 0.15}s`, background: ['#C88F99', '#D6B65E', '#83A48A', '#8EAEBB', '#AD9DBD'][i % 5] }} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
