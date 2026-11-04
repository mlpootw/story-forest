import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { MOODS, catOf } from '../lib/books'
import { SPECIES, SPECIES_LIST } from '../lib/trees'
import { prefersCalm } from '../lib/prefs'
import ReadingTree, { hashStr } from './ReadingTree'
import VisitorCard from './VisitorCard'
import { isEnglishBook, buildVisitors } from '../lib/visitors'
import Cover from './Cover'
import { Avatar } from './ui'
import { fruitReason } from '../lib/fruit'
import MemoryGame from './MemoryGame'
import { pourStart, pourStop, chime, unlockAudio, loadVoices, playVoice } from '../lib/sound'

/*
  孩子模式
  - 家長記錄的新書先是「花苞」，孩子點一下水壺倒水才長成葉子（growth_shown_at 記錄已長出）
  - 一次澆一本：有兩本在等，就要按兩次
  - 重讀的書：澆水時原本的葉子發光
  - 動畫只是呈現資料，不會因為連按水壺產生紀錄
  - 長按右上角的鎖 3 秒回到家長模式
*/
export default function KidMode({ child, ym, speciesId, choice, rows, setRows, onPickTree, onExit }) {
  const [busy, setBusy] = useState(false)
  const [anim, setAnim] = useState({ grow: [], flash: [], pop: [] })
  const [msg, setMsg] = useState('')
  const [big, setBig] = useState(null)
  const [moodIdx, setMoodIdx] = useState(0)
  const [weather, setWeather] = useState('day') // day | rain | night
  const [reaction, setReaction] = useState(null) // { m, key }
  const [game, setGame] = useState(false)
  const [holding, setHolding] = useState(false) // 正在倒水
  const [burst, setBurst] = useState(null) // 畫面中間的大動畫 { leaf, kind, key }
  const [jump, setJump] = useState(0) // 樹喝到水跳一下
  const [rainbow, setRainbow] = useState(0) // 偶爾出現的彩虹
  const voiceTimers = useRef([])
  const [fill, setFill] = useState(0) // 0～1 小樹喝了多少水
  const holdRef = useRef(null)
    const rafRef = useRef()
  const msgTimer = useRef()

  const say = (t) => { setMsg(t); clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(''), 2600) }
  useEffect(() => () => clearTimeout(msgTimer.current), [])

  // 葉子（與家長畫面同樣的規則）
  const leaves = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.child_book_id)) m.set(r.child_book_id, { id: r.child_book_id, book: r.books, cat: r.child_books?.category_id, en: isEnglishBook(r.child_books, r.books), favorite: !!r.child_books?.is_favorite, mag: r.books?.kind === 'magazine', first: r.read_on, sessions: [] })
      m.get(r.child_book_id).sessions.push(r)
    }
    return [...m.values()].map((l) => {
      // 雜誌：有讀英文單元就算英文（招來訪客），封面用最新一期拍的
      if (l.mag) {
        const withCover = l.sessions.filter((s) => s.issue_cover_url).sort((a, b) => (a.read_on < b.read_on ? 1 : -1))[0]
        l = { ...l, en: l.sessions.some((s) => s.has_english), book: withCover ? { ...l.book, cover_url: withCover.issue_cover_url } : l.book }
      }
      const base = { ...l, count: l.sessions.length, shown: l.sessions.some((s) => s.growth_shown_at) }
      return { ...base, fruit: !base.mag && !!fruitReason(base) }
    })
  }, [rows])

  const bookLeaves = useMemo(() => leaves.filter((l) => !l.mag), [leaves])
  const flowers = useMemo(() => leaves.filter((l) => l.mag), [leaves])
  const visitors = useMemo(() => buildVisitors(leaves.filter((l) => l.shown), child.id, ym, speciesId, hashStr), [leaves, child.id, ym, speciesId])
  const [guest, setGuest] = useState(null)
  const pendingIds = useMemo(() => leaves.filter((l) => !l.shown).map((l) => l.id), [leaves])
  // 等澆水的書（一本一次），先讀的先澆
  const pendingBooks = useMemo(() => leaves
    .filter((l) => l.sessions.some((s) => !s.growth_shown_at))
    .sort((a, b) => {
      const fa = a.sessions.filter((s) => !s.growth_shown_at).map((s) => s.read_on).sort()[0]
      const fb = b.sessions.filter((s) => !s.growth_shown_at).map((s) => s.read_on).sort()[0]
      return fa < fb ? -1 : fa > fb ? 1 : 0
    }), [leaves])
  const askWater = () => playVoice('ask')
  // 載入家長錄的聲音；一進來，小樹就說「幫我澆水」（沒錄就不出聲）
  useEffect(() => {
    let alive = true
    loadVoices(supabase, child.family_id).then(() => { if (alive && choice && pendingBooks.length) askWater() })
    return () => { alive = false; voiceTimers.current.forEach(clearTimeout) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const later = (fn, ms) => voiceTimers.current.push(setTimeout(fn, ms))
  // 這個月澆過幾次水：樹會跟著長高一點點
  const wateredCount = rows.filter((r) => r.growth_shown_at).length
  const treeScale = 0.9 + Math.min(0.14, wateredCount * 0.012)

  // 要選心情的書：最近一天讀的、還沒選心情的優先
  const moodQueue = useMemo(() => {
    const sorted = [...rows].sort((a, b) => (a.read_on < b.read_on ? 1 : a.read_on > b.read_on ? -1 : 0))
    const lastDay = sorted[0]?.read_on
    const todays = sorted.filter((r) => r.read_on === lastDay)
    const seen = new Set()
    return todays.filter((r) => (seen.has(r.child_book_id) ? false : seen.add(r.child_book_id)))
  }, [rows])
  const moodRow = moodQueue[Math.min(moodIdx, moodQueue.length - 1)]

  // 澆一本書：這本書還沒澆水的紀錄都長出來
  async function water(leaf) {
    if (busy || !leaf) return
    setBusy(true)
    const ids = leaf.sessions.filter((s) => !s.growth_shown_at).map((s) => s.id)
    const growLeaves = leaf.shown ? [] : [leaf.id]
    const flashLeaves = leaf.shown ? [leaf.id] : []
    const now = new Date().toISOString()
    const { error } = await supabase.from('reading_sessions').update({ growth_shown_at: now }).in('id', ids).is('growth_shown_at', null)
    setBusy(false)
    if (error) { say(zhError(error)); return }
    setRows((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, growth_shown_at: now } : r)))
    chime()
    navigator.vibrate?.(60)
    setJump(Date.now())
    if (!prefersCalm() && Math.random() < 0.4) setRainbow(Date.now()) // 隨機彩虹
    const popLeaves = leaf.fruit ? [leaf.id] : []
    const kind = leaf.mag ? 'flower' : leaf.shown ? 'shine' : 'leaf'
    if (prefersCalm()) setAnim({ grow: growLeaves, flash: flashLeaves, pop: popLeaves })
    else {
      // 先在畫面中間大大地長出來，再飛回樹上
      setBurst({ leaf, kind, fruit: popLeaves.length > 0, key: Date.now() })
      setTimeout(() => { setBurst(null); setAnim({ grow: growLeaves, flash: flashLeaves, pop: popLeaves }) }, 2700)
    }
    const sp = SPECIES[speciesId]
    const left = pendingBooks.length - 1
    say(leaf.mag ? (leaf.sessions.some((s) => !s.growth_shown_at && s.has_english) ? '讀了英文！森林訪客來了 🐰' : leaf.shown ? '樹下的雜誌花又長大了 🌼' : '樹下冒出一朵雜誌花 🌼')
      : leaf.en && !leaf.shown ? '森林訪客來了！點點牠 🐰'
        : popLeaves.length ? `驚喜！${sp.verb ? '開出' : '結出'}${sp.fruitName}了！`
          : leaf.shown ? '葉子亮起來了 ✨' : '長出一片新葉子！')
    const calm = prefersCalm()
    later(() => (leaf.mag ? playVoice('flower', 'leaf') : playVoice('leaf')), calm ? 200 : 1300)
    later(() => playVoice(left > 0 ? 'ask' : 'full'), calm ? 1800 : 3100)
  }

  // ---- 點一下水壺：自動倒水，倒完長出一本書 ----
  function tapCan() {
    unlockAudio()
    if (busy || holding || burst) return
    if (!pendingBooks.length) { say('小樹已經喝飽了 🌿'); playVoice('full'); return }
    setHolding(true)
    pourStart()
    const dur = prefersCalm() ? 500 : 1700
    const t0 = performance.now()
    const loop = (t) => {
      const v = Math.min(1, (t - t0) / dur)
      setFill(v)
      if (v < 1) { rafRef.current = requestAnimationFrame(loop); return }
      pourStop()
      setHolding(false)
      setFill(0)
      water(pendingBooks[0])
    }
    rafRef.current = requestAnimationFrame(loop)
  }
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); pourStop() }, [])

  // 三個表情各有自己的回應，沒有哪一個比較「好」
  const REACT = { 3: '小動物冒出愛心了 💕', 2: '蝴蝶飛過來了 🦋', 1: '小雲朵來陪你 ☁️' }
  async function chooseMood(m) {
    if (!moodRow) return
    setReaction({ m, key: Date.now() })
    const { error } = await supabase.from('reading_sessions').update({ mood: m }).eq('id', moodRow.id)
    if (error) { say(zhError(error)); return }
    setRows((rs) => rs.map((r) => (r.id === moodRow.id ? { ...r, mood: m } : r)))
    say(REACT[m])
    if (moodIdx < moodQueue.length - 1) setTimeout(() => setMoodIdx((i) => i + 1), 1400)
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

        {choice && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex gap-1.5 rounded-full bg-paper-2 p-1" role="group" aria-label="換天氣">
              {[['day', '☀️', '晴天'], ['rain', '🌧️', '下雨'], ['night', '🌙', '晚上']].map(([k, e, t]) => (
                <button key={k} aria-label={t} aria-pressed={weather === k} onClick={() => setWeather(k)}
                  className={`grid h-11 w-11 place-items-center rounded-full text-2xl transition active:scale-90 ${weather === k ? 'bg-paper-card shadow' : 'opacity-60'}`}>{e}</button>
              ))}
            </div>
            <button onClick={() => setGame(true)} className="flex items-center gap-1.5 rounded-full bg-[#F3ECDA] py-2 pl-3 pr-4 font-hand text-lg font-bold shadow-[0_3px_0_#E2D3B0] active:translate-y-0.5 active:shadow-none" aria-label="翻翻樂小遊戲">
              <span className="text-2xl">🃏</span>翻翻樂
            </button>
          </div>
        )}

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
            <div style={{ '--sf-fill': fill }} onClick={(e) => { if (e.target === e.currentTarget && pendingBooks.length) askWater() }}
              className={`sf-sky relative mt-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[28px] transition-colors duration-700 sf-sky-${weather} ${fill > 0 ? 'is-drinking' : ''} ${holding ? 'is-pouring' : ''}`}>
              <WeatherLayer weather={weather} />
              {rainbow > 0 && <Rainbow key={rainbow} />}
              <div className="relative w-full transition-transform duration-1000 ease-out" style={{ transform: `scale(${treeScale})`, transformOrigin: '50% 92%' }}>
               <div key={jump} className={jump ? 'sf-jump' : ''}>
                <ReadingTree childId={child.id} ym={ym} speciesId={speciesId} leaves={bookLeaves} flowers={flowers} className="mx-0"
                  pendingIds={pendingIds} growIds={anim.grow} flashIds={anim.flash} popIds={anim.pop}
                  onPick={(id) => setBig(leaves.find((l) => l.id === id))}
                  visitors={visitors} onVisitor={(id) => setGuest(visitors.find((v) => v.id === id))} />
               </div>
              </div>
              {holding && !prefersCalm() && <BigPour />}
              {reaction && <Reaction key={reaction.key} m={reaction.m} />}
              {burst && <GrowBurst key={burst.key} {...burst} sp={SPECIES[speciesId]} />}
              {/* 喝水進度：一顆慢慢裝滿的水滴 */}
              {(fill > 0 || holding) && pendingBooks.length > 0 && prefersCalm() && (
                <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col items-center" aria-hidden="true">
                  <svg viewBox="0 0 40 52" className="h-14 w-11">
                    <defs><clipPath id="sf-dropclip"><path d="M20 2 C20 2 4 22 4 33 a16 16 0 0 0 32 0 C36 22 20 2 20 2Z" /></clipPath></defs>
                    <path d="M20 2 C20 2 4 22 4 33 a16 16 0 0 0 32 0 C36 22 20 2 20 2Z" fill="#fff" fillOpacity=".7" stroke="#8EAEBB" strokeWidth="2.5" />
                    <rect x="0" y={52 - 50 * fill} width="40" height="52" fill="#8EAEBB" clipPath="url(#sf-dropclip)" />
                  </svg>
                  <span className="mt-0.5 rounded-full bg-paper-card/90 px-2 text-xs font-bold text-[#5E8CA3]">{fill >= 1 ? '喝飽了！' : '喝水中'}</span>
                </div>
              )}
              <div className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper-card/95 px-4 py-1.5 font-hand text-lg shadow-sm transition-opacity ${msg ? 'opacity-100' : 'opacity-0'}`}>{msg}</div>
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              <button aria-label="水壺：點一下倒水給小樹喝" onClick={tapCan} onContextMenu={(e) => e.preventDefault()}
                className={`relative grid h-28 w-28 touch-none select-none place-items-center rounded-full bg-[#E5EDE3] transition ${holding ? 'scale-95 bg-[#D6E4EA]' : pendingBooks.length ? 'sf-wiggle' : 'opacity-75'}`}>
                <svg viewBox="0 0 64 64" className={`sf-can h-20 w-20 ${holding ? 'pour' : ''}`}>
                  <path d="M14 26h28l-3 26a4 4 0 0 1-4 3.5H21a4 4 0 0 1-4-3.5z" fill="#8EAEBB" /><path d="M14 26h28l-.6 5H14.6z" fill="#7A9BA8" />
                  <path d="M42 32l13-11 3 3-12 13z" fill="#8EAEBB" /><circle cx="57" cy="22" r="3.5" fill="#7A9BA8" />
                  <path d="M20 26c0-8 4-12 8-12s8 4 8 12" fill="none" stroke="#7A9BA8" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
                {pendingBooks.length > 0 && !holding && !burst && <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper-card px-2.5 text-[12px] font-bold text-sage-deep shadow">點我澆水</span>}
                {pendingBooks.length > 0 && <span className="absolute right-1 top-1 grid h-8 min-w-8 place-items-center rounded-full bg-gold px-1.5 text-base font-bold text-[#4A3F2E] shadow-[0_0_0_3px_#F8F4EB]">{pendingBooks.length}</span>}
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
      {game && <MemoryGame child={child} leaves={leaves.filter((l) => l.shown)} rows={rows} onClose={() => setGame(false)} />}
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
      <span className={`pointer-events-none absolute right-0 top-[58px] z-10 w-32 text-right text-[11px] text-ink-soft transition-opacity ${p > 0 ? 'opacity-100' : 'opacity-0'}`}>貓頭鷹要醒來了…繼續按住</span>
    </div>
  )
}

// 天氣：晴天、下雨、晚上（只是畫面變化）
function WeatherLayer({ weather }) {
  if (weather === 'rain') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute left-[8%] top-3 text-5xl opacity-90">☁️</span><span className="absolute right-[10%] top-6 text-4xl opacity-80">☁️</span>
        {Array.from({ length: 22 }, (_, i) => (
          <span key={i} className="sf-rain" style={{ left: `${(i * 4.7) % 100}%`, animationDelay: `${(i % 7) * 0.17}s`, animationDuration: `${0.9 + (i % 4) * 0.15}s` }} />
        ))}
      </div>
    )
  }
  if (weather === 'night') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <span className="absolute right-[12%] top-4 text-5xl">🌙</span>
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className="sf-star" style={{ left: `${(i * 13.7) % 92 + 3}%`, top: `${(i * 7.3) % 40 + 3}%`, animationDelay: `${(i % 5) * 0.5}s` }} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <span key={'f' + i} className="sf-firefly" style={{ left: `${15 + i * 13}%`, top: `${55 + (i % 3) * 9}%`, animationDelay: `${i * 0.6}s` }} />
        ))}
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className="sf-sun absolute left-[8%] top-3 text-5xl">☀️</span>
      <span className="sf-cloud absolute top-8 text-3xl opacity-70">☁️</span>
    </div>
  )
}

// 選心情後的回應：每一種都有自己的小動畫
function Reaction({ m }) {
  const items = m === 3
    ? Array.from({ length: 7 }, (_, i) => ({ e: ['💕', '❤️', '💗'][i % 3], cls: 'sf-up', left: 25 + i * 8, d: i * 0.12 }))
    : m === 2
      ? Array.from({ length: 4 }, (_, i) => ({ e: '🦋', cls: 'sf-fly', top: 20 + i * 14, d: i * 0.25 }))
      : [{ e: '☁️', cls: 'sf-drift', top: 14, d: 0 }, ...Array.from({ length: 6 }, (_, i) => ({ e: '💧', cls: 'sf-drip', left: 38 + i * 5, d: 0.8 + i * 0.12 }))]
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {items.map((it, i) => (
        <span key={i} className={`absolute text-3xl ${it.cls}`} style={{ left: it.left != null ? `${it.left}%` : undefined, top: it.top != null ? `${it.top}%` : undefined, animationDelay: `${it.d}s` }}>{it.e}</span>
      ))}
    </div>
  )
}

// 澆完水：畫面中間大大的動畫（封面放大 → 變成葉子／花 → 飛回樹上）
function GrowBurst({ leaf, kind, fruit, sp }) {
  const color = catOf(leaf.cat).color
  const label = kind === 'flower' ? (leaf.shown ? '雜誌花長大了！' : '開出一朵雜誌花！') : kind === 'shine' ? '葉子變亮了！' : '長出新葉子！'
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-hidden="true">
      <div className="sf-burst-glow absolute h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${color}66 0%, ${color}00 70%)` }} />
      <div className="sf-burst-cover absolute w-36"><Cover book={leaf.book} categoryId={leaf.cat} size="sm" /></div>
      <div className="sf-burst-leaf absolute">
        {kind === 'flower' ? (
          <svg viewBox="-50 -50 100 100" className="h-44 w-44">
            {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="0" cy="-24" rx="13" ry="24" fill={color} transform={`rotate(${i * 45})`} />)}
            <circle r="15" fill="#F3DE9A" /><circle r="15" fill="none" stroke="#D6B65E" strokeWidth="3" />
          </svg>
        ) : (
          <svg viewBox="-50 -50 100 100" className={`h-44 w-44 ${kind === 'shine' ? 'sf-burst-shine' : ''}`}>
            <path d="M0 44 C-36 20 -40 -22 0 -46 C40 -22 36 20 0 44 Z" fill={color} />
            <path d="M0 44 C-36 20 -40 -22 0 -46 C40 -22 36 20 0 44 Z" fill="#fff" fillOpacity=".18" transform="scale(.6) translate(-8 -6)" />
            <path d="M0 40 L0 -38 M0 6 L-15 -8 M0 6 L15 -8 M0 -14 L-11 -26 M0 -14 L11 -26" stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        )}
        {fruit && <svg viewBox="-14 -14 28 28" className="sf-burst-fruit absolute -right-4 -top-2 h-16 w-16" dangerouslySetInnerHTML={{ __html: sp.fruit(0, 0) }} />}
      </div>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="sf-burst-spark absolute text-2xl" style={{ '--a': `${i * 36}deg`, animationDelay: `${0.85 + (i % 3) * 0.06}s` }}>✨</span>
      ))}
      <div className="sf-burst-label absolute bottom-[12%] rounded-full bg-paper-card/95 px-5 py-2 font-hand text-2xl font-bold shadow">{label}</div>
    </div>
  )
}

// 倒水：大水壺飛到樹上方，倒出一大片水，地上濺起水花
function BigPour() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <div className="sf-bigcan absolute right-[6%] top-[4%] w-28">
        <svg viewBox="0 0 64 64" className="sf-bigcan-tilt h-28 w-28 drop-shadow-md">
          <path d="M14 26h28l-3 26a4 4 0 0 1-4 3.5H21a4 4 0 0 1-4-3.5z" fill="#8EAEBB" /><path d="M14 26h28l-.6 5H14.6z" fill="#7A9BA8" />
          <path d="M42 32l13-11 3 3-12 13z" fill="#8EAEBB" /><circle cx="57" cy="22" r="3.5" fill="#7A9BA8" />
          <path d="M20 26c0-8 4-12 8-12s8 4 8 12" fill="none" stroke="#7A9BA8" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="25" cy="42" r="3" fill="#fff" fillOpacity=".5" />
        </svg>
      </div>
      {/* 水柱＋很多水滴 */}
      {Array.from({ length: 34 }, (_, i) => (
        <span key={i} className="sf-bigdrop absolute" style={{ left: `${34 + ((i * 17) % 30)}%`, animationDelay: `${0.35 + (i % 12) * 0.07}s`, animationDuration: `${0.7 + (i % 4) * 0.1}s`, width: 6 + (i % 3) * 3, height: 10 + (i % 3) * 4 }} />
      ))}
      {/* 地上的水花 */}
      {Array.from({ length: 3 }, (_, i) => (
        <span key={'r' + i} className="sf-splash absolute left-1/2 top-[86%] h-6 w-40 -translate-x-1/2 rounded-[50%] border-[3px] border-[#8EAEBB]" style={{ animationDelay: `${0.6 + i * 0.35}s` }} />
      ))}
      {Array.from({ length: 10 }, (_, i) => (
        <span key={'s' + i} className="sf-splashdrop absolute top-[85%] h-2.5 w-2.5 rounded-full bg-[#8EAEBB]" style={{ left: `${38 + i * 2.6}%`, '--dx': `${(i - 4.5) * 9}px`, animationDelay: `${0.7 + (i % 4) * 0.2}s` }} />
      ))}
    </div>
  )
}

// 隨機彩虹
function Rainbow() {
  const colors = ['#E7A1A1', '#EBC28F', '#E9DD9B', '#A9CFA4', '#9DC3D6', '#B4A7D3']
  return (
    <svg viewBox="0 0 200 100" className="sf-rainbow pointer-events-none absolute left-1/2 top-[6%] z-0 w-[95%] -translate-x-1/2" aria-hidden="true">
      {colors.map((c, i) => <path key={c} d={`M ${10 + i * 7} 100 A ${90 - i * 7} ${90 - i * 7} 0 0 1 ${190 - i * 7} 100`} fill="none" stroke={c} strokeWidth="7" strokeOpacity=".75" />)}
    </svg>
  )
}
