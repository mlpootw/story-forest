import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { MOODS } from '../lib/books'
import { SPECIES, SPECIES_LIST } from '../lib/trees'
import { prefersCalm } from '../lib/prefs'
import ReadingTree, { hashStr } from './ReadingTree'
import VisitorCard from './VisitorCard'
import { isEnglishBook, buildVisitors } from '../lib/visitors'
import Cover from './Cover'
import { Avatar } from './ui'

/*
  孩子模式
  - 家長記錄的新書先是「花苞」，孩子按水壺才長成葉子（growth_shown_at 記錄已長出）
  - 重讀的書：澆水時原本的葉子發光
  - 動畫只是呈現資料，不會因為連按水壺產生紀錄
  - 長按右上角的鎖 3 秒回到家長模式
*/
export default function KidMode({ child, ym, speciesId, choice, rows, setRows, onPickTree, onExit }) {
  const [busy, setBusy] = useState(false)
  const [pour, setPour] = useState(false)
  const [drops, setDrops] = useState(0)
  const [anim, setAnim] = useState({ grow: [], flash: [], pop: [] })
  const [msg, setMsg] = useState('')
  const [big, setBig] = useState(null)
  const [moodIdx, setMoodIdx] = useState(0)
  const msgTimer = useRef()

  const say = (t) => { setMsg(t); clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(''), 2600) }
  useEffect(() => () => clearTimeout(msgTimer.current), [])

  // 葉子（與家長畫面同樣的規則）
  const leaves = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.child_book_id)) m.set(r.child_book_id, { id: r.child_book_id, book: r.books, cat: r.child_books?.category_id, en: isEnglishBook(r.child_books, r.books), first: r.read_on, sessions: [] })
      m.get(r.child_book_id).sessions.push(r)
    }
    return [...m.values()].map((l) => {
      const loved = l.sessions.some((s) => s.mood === 3)
      return { ...l, count: l.sessions.length, fruit: loved || l.sessions.length >= 2, shown: l.sessions.some((s) => s.growth_shown_at) }
    })
  }, [rows])

  const visitors = useMemo(() => buildVisitors(leaves.filter((l) => l.shown), child.id, ym, speciesId, hashStr), [leaves, child.id, ym, speciesId])
  const [guest, setGuest] = useState(null)
  const pendingIds = useMemo(() => leaves.filter((l) => !l.shown).map((l) => l.id), [leaves])
  const pendingSessions = rows.filter((r) => !r.growth_shown_at)

  // 要選心情的書：最近一天讀的、還沒選心情的優先
  const moodQueue = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (a.read_on < b.read_on ? 1 : a.read_on > b.read_on ? -1 : 0))
    const lastDay = sorted[0]?.read_on
    const todays = sorted.filter((r) => r.read_on === lastDay)
    const seen = new Set()
    return todays.filter((r) => (seen.has(r.child_book_id) ? false : seen.add(r.child_book_id)))
  }, [rows])
  const moodRow = moodQueue[Math.min(moodIdx, moodQueue.length - 1)]

  async function water() {
    if (busy) return
    if (!pendingSessions.length) { say('小樹已經喝飽了 🌿'); return }
    setBusy(true)
    const calm = prefersCalm()
    setPour(true)
    if (!calm) setDrops((n) => n + 1)
    const ids = pendingSessions.map((r) => r.id)
    const growLeaves = leaves.filter((l) => !l.shown).map((l) => l.id)
    const flashLeaves = leaves.filter((l) => l.shown && l.sessions.some((s) => !s.growth_shown_at)).map((l) => l.id)
    const now = new Date().toISOString()
    const req = supabase.from('reading_sessions').update({ growth_shown_at: now }).in('id', ids).is('growth_shown_at', null)
    await new Promise((r) => setTimeout(r, calm ? 50 : 1300))
    const { error } = await req
    setPour(false)
    setBusy(false)
    if (error) { say(zhError(error)); return }
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, growth_shown_at: now } : r)))
    setAnim({ grow: growLeaves, flash: flashLeaves, pop: [] })
    const newGuests = leaves.filter((l) => growLeaves.includes(l.id) && l.en).length
    say(newGuests ? `森林訪客來了！點點牠 🐰` : growLeaves.length ? `長出 ${growLeaves.length} 片新葉子！` : '葉子亮起來了 ✨')
  }

  async function chooseMood(m) {
    if (!moodRow) return
    const prevLeaf = leaves.find((l) => l.id === moodRow.child_book_id)
    const { error } = await supabase.from('reading_sessions').update({ mood: m }).eq('id', moodRow.id)
    if (error) { say(zhError(error)); return }
    setRows((rs) => rs.map((r) => (r.id === moodRow.id ? { ...r, mood: m } : r)))
    const sp = SPECIES[speciesId]
    if (m === 3 && prevLeaf && !prevLeaf.fruit && prevLeaf.shown) {
      setAnim({ grow: [], flash: [], pop: [prevLeaf.id] })
      say(`${sp.verb ? '開出' : '結出'}一${sp.unit || '顆'}${sp.fruitName}了！`)
    } else {
      say(`${MOODS[m].e} 記下來了`)
    }
    if (moodIdx < moodQueue.length - 1) setTimeout(() => setMoodIdx((i) => i + 1), 900)
  }

  const sp = SPECIES[speciesId]

  return (
    <section className="fixed inset-0 z-50 flex flex-col bg-paper" aria-label="孩子模式"
      style={{ padding: 'calc(10px + env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) calc(14px + env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))' }}>
      <div className="mx-auto flex h-full w-full max-w-[480px] min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-hand text-xl font-bold">
            <Avatar child={child} size={38} />{child.nickname}的{choice ? sp.name : '小樹'}
          </div>
          <HoldToExit onExit={onExit} />
        </div>

        {!choice ? (
          <div className="flex flex-1 flex-col justify-center">
            <p className="h-hand mb-4 text-center text-2xl">這個月要種哪一棵樹？</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SPECIES_LIST.map((s) => (
                <button key={s.id} onClick={() => onPickTree(s.id)} className="flex flex-col items-center rounded-3xl border-2 border-line bg-paper-card pb-3 pt-2 active:scale-95">
                  <svg viewBox="-14 -14 28 28" className="h-16 w-16" dangerouslySetInnerHTML={{ __html: s.fruit(0, 0) }} />
                  <b className="h-hand text-lg">{s.name}</b>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              <div className="w-full">
                <ReadingTree childId={child.id} ym={ym} speciesId={speciesId} leaves={leaves} className="mx-0"
                  pendingIds={pendingIds} growIds={anim.grow} flashIds={anim.flash} popIds={anim.pop}
                  onPick={(id) => setBig(leaves.find((l) => l.id === id))}
                  visitors={visitors} onVisitor={(id) => setGuest(visitors.find((v) => v.id === id))} />
              </div>
              {Array.from({ length: drops ? 14 : 0 }, (_, i) => (
                <span key={`${drops}-${i}`} className="sf-drop" style={{ left: `${28 + ((i * 37) % 44)}%`, top: `${10 + ((i * 13) % 20)}%`, animationDelay: `${(i % 5) * 0.12}s` }} />
              ))}
              <div className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper-card/95 px-4 py-1.5 font-hand text-lg shadow-sm transition-opacity ${msg ? 'opacity-100' : 'opacity-0'}`}>{msg}</div>
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <button onClick={water} aria-label="澆水" className={`relative grid h-28 w-28 place-items-center rounded-full bg-[#E5EDE3] ${pendingSessions.length ? '' : 'opacity-75'}`}>
                <svg viewBox="0 0 64 64" className={`sf-can h-20 w-20 ${pour ? 'pour' : ''}`}>
                  <path d="M14 26h28l-3 26a4 4 0 0 1-4 3.5H21a4 4 0 0 1-4-3.5z" fill="#8EAEBB" /><path d="M14 26h28l-.6 5H14.6z" fill="#7A9BA8" />
                  <path d="M42 32l13-11 3 3-12 13z" fill="#8EAEBB" /><circle cx="57" cy="22" r="3.5" fill="#7A9BA8" />
                  <path d="M20 26c0-8 4-12 8-12s8 4 8 12" fill="none" stroke="#7A9BA8" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
                {pendingSessions.length > 0 && <span className="absolute right-1 top-1 grid h-8 min-w-8 place-items-center rounded-full bg-gold px-1.5 text-base font-bold text-[#4A3F2E] shadow-[0_0_0_3px_#F8F4EB]">{pendingSessions.length}</span>}
              </button>

              <div className="min-w-0">
                {moodRow ? (
                  <>
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="w-12 shrink-0"><Cover book={moodRow.books} categoryId={moodRow.child_books?.category_id} size="xs" /></div>
                      <p className="h-hand text-lg leading-tight">喜歡<br />這本書嗎？</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[3, 2, 1].map((m) => (
                        <button key={m} onClick={() => chooseMood(m)} aria-label={MOODS[m].t}
                          className={`flex flex-col items-center rounded-2xl border-2 pb-1 pt-2 text-4xl leading-none active:scale-95 ${moodRow.mood === m ? 'border-gold bg-[#F6EDD3]' : 'border-transparent bg-paper-card'}`}>
                          {MOODS[m].e}<small className="mt-1 text-[11px] text-ink-soft">{MOODS[m].t}</small>
                        </button>
                      ))}
                    </div>
                    {moodQueue.length > 1 && (
                      <div className="mt-1.5 flex justify-center gap-1.5">
                        {moodQueue.map((r, i) => <button key={r.id} aria-label={`第 ${i + 1} 本`} onClick={() => setMoodIdx(i)} className={`h-2.5 w-2.5 rounded-full ${i === Math.min(moodIdx, moodQueue.length - 1) ? 'bg-sage' : 'bg-line'}`} />)}
                      </div>
                    )}
                  </>
                ) : <p className="h-hand text-lg leading-snug text-ink-soft">讀完一本書，<br />再來這裡澆水喔！</p>}
              </div>
            </div>
          </>
        )}
      </div>

      <VisitorCard visitor={guest} onClose={() => setGuest(null)} />
      {big && (
        <button className="fixed inset-0 z-[55] grid place-items-center bg-[#3E3832]/55 p-8" onClick={() => setBig(null)} aria-label="關閉封面">
          <div className="w-[min(64vw,260px)]"><Cover book={big.book} categoryId={big.cat} size="lg" /></div>
          <span className="sr-only">{big.book.title}</span>
        </button>
      )}
    </section>
  )
}

function HoldToExit({ onExit }) {
  const [p, setP] = useState(0)
  const raf = useRef()
  const t0 = useRef(0)
  const stop = () => { cancelAnimationFrame(raf.current); setP(0) }
  const tick = () => {
    const v = Math.min(1, (performance.now() - t0.current) / 3000)
    setP(v)
    if (v >= 1) { stop(); onExit(); return }
    raf.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return (
    <div className="relative">
      <button aria-label="睡覺的貓頭鷹，長按三秒回到家長模式" className="relative grid h-14 w-14 touch-none select-none place-items-center rounded-full bg-paper-2"
        onPointerDown={(e) => { e.preventDefault(); t0.current = performance.now(); raf.current = requestAnimationFrame(tick) }}
        onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
          <circle cx="28" cy="28" r="25" fill="none" stroke="#E2D8C5" strokeWidth="3" />
          <circle cx="28" cy="28" r="25" fill="none" stroke="#83A48A" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="157" strokeDashoffset={157 * (1 - p)} />
        </svg>
        {/* 睡覺的貓頭鷹：長按 3 秒會醒來，帶大人回到家長模式 */}
        <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
          <path d="M10 14 L8 6 L15 11 Z M30 14 L32 6 L25 11 Z" fill="#98775F" />
          <ellipse cx="20" cy="22" rx="12" ry="13" fill="#B08A6E" />
          <ellipse cx="20" cy="26" rx="7" ry="8" fill="#E8D7C0" />
          {p > 0.5 ? (
            <><circle cx="15" cy="18" r="4" fill="#fff" /><circle cx="25" cy="18" r="4" fill="#fff" /><circle cx="15" cy="18" r="2" fill="#3E3832" /><circle cx="25" cy="18" r="2" fill="#3E3832" /></>
          ) : (
            <><path d="M11.5 18 q3.5 3 7 0" stroke="#3E3832" strokeWidth="1.6" fill="none" strokeLinecap="round" /><path d="M21.5 18 q3.5 3 7 0" stroke="#3E3832" strokeWidth="1.6" fill="none" strokeLinecap="round" /></>
          )}
          <path d="M18.5 21 L20 24 L21.5 21 Z" fill="#D6B65E" />
          <path d="M14 27 q1 1 2 0 M19 30 q1 1 2 0 M24 27 q1 1 2 0" stroke="#C9AE8E" strokeWidth="1" fill="none" />
        </svg>
      </button>
      <span className={`absolute right-0 top-[58px] w-32 text-right text-[11px] text-ink-soft transition-opacity ${p > 0 ? 'opacity-100' : 'opacity-0'}`}>貓頭鷹要醒來了…繼續按住</span>
    </div>
  )
}
