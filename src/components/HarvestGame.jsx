import { useEffect, useMemo, useRef, useState } from 'react'
import ReadingTree from './ReadingTree'
import { TREE_SETS } from '../lib/treeArt'
import { art } from '../lib/art'
import { tick, chime, playVoice } from '../lib/sound'

/*
  芭樂收成：點樹上的芭樂，一顆一顆飛進籃子裡。
  全部摘完才算收成（中途離開就不算，下次再來）。
*/
function Fly({ x, y, tx, ty, href }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)))
    return () => cancelAnimationFrame(r)
  }, [])
  return (
    <img src={href} alt="" draggable="false" className="pointer-events-none fixed z-[90] h-11 w-9 object-contain"
      style={{ left: x - 18, top: y - 22, transition: 'transform .7s cubic-bezier(.45,-.25,.6,1), opacity .2s .55s', transform: go ? `translate(${tx - x}px, ${ty - y}px) scale(.55) rotate(240deg)` : 'none', opacity: go ? 0.9 : 1 }} />
  )
}

export default function HarvestGame({ child, ym, speciesId, leaves, flowers, pendingIds, harvestedIds, targetIds, onDone, onClose }) {
  const set = TREE_SETS[speciesId]
  const [picked, setPicked] = useState([])
  const [flying, setFlying] = useState([])
  const [done, setDone] = useState(false)
  const [bounce, setBounce] = useState(0)
  const basket = useRef(null)
  const byId = useMemo(() => new Map(leaves.map((l) => [l.id, l])), [leaves])
  const total = targetIds.length
  const timers = useRef([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function finish() {
    timers.current.push(setTimeout(() => { setDone(true); chime(); playVoice('harvest') }, 750))
  }
  function pick(id, e) {
    if (done || !targetIds.includes(id) || picked.includes(id)) return
    const next = [...picked, id]
    setPicked(next)
    setBounce((b) => b + 1)
    tick(next.length)
    const b = basket.current?.getBoundingClientRect()
    const x = e?.clientX ?? window.innerWidth / 2
    const y = e?.clientY ?? window.innerHeight / 2
    const ripe = (byId.get(id)?.count || 1) > 1
    setFlying((f) => [...f, { id, x, y, tx: b ? b.left + b.width / 2 : x, ty: b ? b.top + b.height * 0.35 : y + 220, href: art(ripe ? set.ripe : set.fruit) }])
    timers.current.push(setTimeout(() => setFlying((f) => f.filter((o) => o.id !== id)), 800))
    if (next.length >= total) finish()
  }
  function rest() {
    // 太累了：把剩下的一次摘完
    setPicked(targetIds)
    setBounce((b) => b + 1)
    tick(8)
    finish()
  }

  return (
    <div className="fixed inset-0 z-[66] flex flex-col overflow-hidden bg-gradient-to-b from-[#CFE5EE] to-[#EAF3E4]" role="dialog" aria-label="芭樂收成"
      style={{ padding: 'calc(10px + env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))' }}>
      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between">
        <div>
          <h2 className="h-hand text-2xl">🧺 收成囉！</h2>
          <p className="text-[13px] text-ink-soft">點一點{set.fruitName}，把它們摘進籃子</p>
        </div>
        <button className="grid h-12 w-12 place-items-center rounded-full bg-paper text-2xl shadow" onClick={onClose} aria-label="先不收成，回到小樹">🌳</button>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 items-center">
        <div className="w-full">
          <ReadingTree childId={child.id} ym={ym} speciesId={speciesId} leaves={leaves} flowers={flowers} pendingIds={pendingIds}
            harvestedIds={harvestedIds} hideIds={picked} className="mx-0" maxAnimals={1} onPick={pick} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[480px] items-center justify-center gap-4 pb-1">
        <div ref={basket} key={bounce} className={`relative grid h-24 w-28 place-items-center text-7xl ${bounce ? 'sf-jump' : ''}`}>
          <span aria-hidden="true">🧺</span>
          <span className="absolute -right-1 top-0 grid h-9 min-w-9 place-items-center rounded-full bg-gold px-2 text-lg font-bold text-[#4A3F2E] shadow-[0_0_0_3px_#EAF3E4]">{picked.length}</span>
        </div>
        <div className="text-left">
          <p className="h-hand text-xl">{picked.length} / {total} 顆</p>
          {!done && picked.length >= Math.ceil(total / 2) && picked.length < total && (
            <button className="btn-ghost mt-1 px-3 py-1.5 text-sm" onClick={rest}>剩下的一起收</button>
          )}
        </div>
      </div>

      {flying.map((f) => <Fly key={f.id} x={f.x} y={f.y} tx={f.tx} ty={f.ty} href={f.href} />)}

      {done && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-[#2E3A52]/55 p-6" role="dialog" aria-label="收成完成">
          <div className="sf-unlock w-full max-w-[320px] rounded-[32px] bg-paper px-6 pb-6 pt-8 text-center shadow-xl">
            <div className="text-7xl">🧺</div>
            <p className="h-hand mt-2 text-3xl">收成完成！</p>
            <p className="h-hand mt-1 text-xl text-sage-deep">籃子裡有 {total} 顆{set.fruitName}</p>
            <button className="btn mt-5 w-full py-3 text-lg" onClick={() => onDone(targetIds)}>太棒了！</button>
          </div>
          <div className="pointer-events-none fixed inset-0" aria-hidden="true">
            {Array.from({ length: 16 }, (_, i) => <span key={i} className="sf-confetti" style={{ left: `${(i * 6.3) % 96}%`, animationDelay: `${(i % 6) * 0.15}s`, background: ['#C88F99', '#D6B65E', '#83A48A', '#8EAEBB', '#AD9DBD'][i % 5] }} />)}
          </div>
        </div>
      )}
    </div>
  )
}
