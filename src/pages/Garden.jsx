import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { ageText } from '../lib/ages'
import { CATEGORIES, UNKNOWN_CAT, catOf, ymd, ymOf, shiftMonth, monthLabel, dayLabel, MOODS } from '../lib/books'
import { addSession } from '../lib/records'
import { SPECIES, SPECIES_LIST, SEASONS } from '../lib/trees'
import ReadingTree, { hashStr, stageOf, STAGES } from '../components/ReadingTree'
import Cover from '../components/Cover'
import { Sheet } from '../components/ui'
import KidMode from '../components/KidMode'
import { fruitReason, FRUIT_REASON_TEXT } from '../lib/fruit'
import VisitorCard from '../components/VisitorCard'
import { isEnglishBook, buildVisitors } from '../lib/visitors'

export default function Garden({ child, family, refresh, onChanged, onAdd }) {
  const thisMonth = ymOf(ymd())
  const [ym, setYm] = useState(thisMonth)
  const [rows, setRows] = useState(null)
  const [choice, setChoice] = useState(undefined)
  const [error, setError] = useState('')
  const [picker, setPicker] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [zoom, setZoom] = useState(false)
  const [kid, setKid] = useState(false)
  const [guest, setGuest] = useState(null)

  const load = useCallback(async () => {
    setError('')
    const [s, t] = await Promise.all([
      supabase.from('reading_sessions')
        .select('*, child_books(category_id, parent_note, is_english, cover_url, is_favorite), books(id, title, cover_url, authors, language, kind)')
        .eq('child_id', child.id).gte('read_on', ym + '-01').lt('read_on', shiftMonth(ym, 1) + '-01').order('read_on'),
      supabase.from('tree_choices').select('species').eq('child_id', child.id).eq('month', ym + '-01').maybeSingle()
    ])
    if (s.error) return setError(zhError(s.error))
    setRows(s.data.map((r) => (r.child_books?.cover_url ? { ...r, books: { ...r.books, cover_url: r.child_books.cover_url } } : r)))
    setChoice(t.error ? null : t.data?.species || null) // 還沒執行第四階段 SQL 時，仍可正常顯示
  }, [child.id, ym])
  useEffect(() => { setRows(null); setChoice(undefined); setZoom(false); load() }, [load, refresh])

  // 每本書在這個月是一片葉子
  const leaves = useMemo(() => {
    if (!rows) return []
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.child_book_id)) m.set(r.child_book_id, { id: r.child_book_id, book: r.books, cat: r.child_books?.category_id, parentNote: r.child_books?.parent_note, en: isEnglishBook(r.child_books, r.books), favorite: !!r.child_books?.is_favorite, mag: r.books?.kind === 'magazine', sessions: [] })
      m.get(r.child_book_id).sessions.push(r)
    }
    return [...m.values()].map((l) => {
      // 雜誌：有讀英文單元就算英文（招來訪客），封面用最新一期拍的
      if (l.mag) {
        const withCover = l.sessions.filter((s) => s.issue_cover_url).sort((a, b) => (a.read_on < b.read_on ? 1 : -1))[0]
        l = { ...l, en: l.sessions.some((s) => s.has_english), book: withCover ? { ...l.book, cover_url: withCover.issue_cover_url } : l.book }
      }
      const moods = l.sessions.map((s) => s.mood).filter(Boolean)
      const base = { ...l, count: l.sessions.length, first: l.sessions[0].read_on, topMood: topMood(moods) }
      const why = base.mag ? null : fruitReason(base)
      return { ...base, fruit: !!why, fruitWhy: why }
    })
  }, [rows])

  // 雜誌是樹下的花，不算樹上的葉子
  const bookLeaves = useMemo(() => leaves.filter((l) => !l.mag), [leaves])
  const flowers = useMemo(() => leaves.filter((l) => l.mag), [leaves])
  // 還沒在孩子模式澆水的書，在這裡也只是花苞，要等孩子澆水才長成葉子
  const pendingIds = useMemo(() => leaves.filter((l) => !l.sessions.some((s) => s.growth_shown_at)).map((l) => l.id), [leaves])
  const grownLeaves = useMemo(() => bookLeaves.filter((l) => !pendingIds.includes(l.id)), [bookLeaves, pendingIds])
  const isCurrent = ym === thisMonth
  const speciesId = choice || SPECIES_LIST[hashStr(child.id + ym) % SPECIES_LIST.length].id
  const sp = SPECIES[speciesId]
  const canChange = isCurrent && (!choice || leaves.every((l) => l.sessions.every((x) => !x.growth_shown_at)))
  const needsPick = isCurrent && choice === null
  const stage = stageOf(grownLeaves.length)
  const season = SEASONS[Number(ym.slice(5, 7))]
  const fruits = leaves.filter((l) => l.fruit && !pendingIds.includes(l.id)).length
  const counts = {}
  leaves.forEach((l) => { const k = l.cat || 'none'; counts[k] = (counts[k] || 0) + 1 })
  const open = leaves.find((l) => l.id === openId)
  const visitors = useMemo(() => buildVisitors(leaves.filter((l) => !pendingIds.includes(l.id)), child.id, ym, speciesId, hashStr), [leaves, pendingIds, child.id, ym, speciesId])
  const waiting = rows ? rows.filter((r) => !r.growth_shown_at).length : 0

  async function pick(id) {
    const { error: err } = await supabase.from('tree_choices').upsert({ child_id: child.id, family_id: family.id, month: ym + '-01', species: id }, { onConflict: 'child_id,month' })
    if (err) return toast(/tree_choices|relation|schema cache/i.test(err.message) ? '請先到 Supabase 執行第四階段的更新 SQL' : zhError(err))
    setChoice(id); setPicker(false)
    if (!kid) toast(`${child.nickname}這個月種下了${SPECIES[id].name} 🌱`)
  }

  return (
    <div>
      <div className="mb-0.5 mt-1 flex items-center justify-between">
        <button className="h-10 w-10 rounded-full border border-line text-lg" aria-label="上個月" onClick={() => setYm(shiftMonth(ym, -1))}>‹</button>
        <div className="text-center">
          <h2 className="h-hand text-[22px] leading-tight">{monthLabel(ym)}</h2>
          <p className="text-[12.5px] text-ink-soft">{child.nickname}{ageText(child) && ` · ${ageText(child)}`}</p>
        </div>
        <button className="h-10 w-10 rounded-full border border-line text-lg disabled:opacity-30" aria-label="下個月" disabled={isCurrent} onClick={() => setYm(shiftMonth(ym, 1))}>›</button>
      </div>

      {error && <div className="error-box mt-3">{error} <button className="underline" onClick={load}>重試</button></div>}
      {!rows && !error && <p className="py-24 text-center text-sm text-ink-soft">正在走進花園…</p>}

      {rows && (
        <>
          <p className="mt-1 text-center text-[13px] text-ink-soft">
            {needsPick ? '還沒選樹' : sp.name}{grownLeaves.length ? ` · ${grownLeaves.length} 片故事葉` : ''}{flowers.length ? ` · ${flowers.length} 朵雜誌花` : ''} · <b className="h-hand text-[15px] text-sage-deep">{STAGES[stage]}</b>
            {canChange && choice && <button className="ml-2 text-[12px] underline" onClick={() => setPicker(true)}>換一棵</button>}
          </p>

          {needsPick ? (
            <div className="mt-4 rounded-3xl bg-sage-mist px-4 py-6 text-center">
              <p className="h-hand text-lg">新的月份開始了！</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">和{child.nickname}一起選一棵這個月要種的樹吧</p>
              <button className="btn mt-4" onClick={() => setPicker(true)}>🌱 選這個月的樹</button>
            </div>
          ) : (
            <div className="relative">
              {bookLeaves.length > 18 && (
                <button className="absolute right-2 top-2 z-10 rounded-full border border-line bg-paper/90 px-3 py-1 text-[12.5px]" onClick={() => setZoom(!zoom)}>{zoom ? '縮小' : '放大看葉子'}</button>
              )}
              <ReadingTree childId={child.id} ym={ym} speciesId={speciesId} leaves={bookLeaves} flowers={flowers} pendingIds={pendingIds} zoom={zoom} onPick={setOpenId}
                visitors={visitors} onVisitor={(id) => setGuest(visitors.find((v) => v.id === id))} />
            </div>
          )}

          {isCurrent && (
            <div className="notice mt-3 flex items-center gap-4">
              {/* 給孩子認的大按鈕：水壺＋自己的頭像，有水要澆時會搖一搖 */}
              <button onClick={() => setKid(true)} aria-label={`${child.nickname}的孩子模式`}
                className={`relative grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-[#DCE8DF] shadow-[0_3px_0_#B9CDBE] active:translate-y-0.5 active:shadow-none ${waiting > 0 ? 'sf-wiggle' : ''}`}>
                <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden="true">
                  <path d="M14 26h28l-3 26a4 4 0 0 1-4 3.5H21a4 4 0 0 1-4-3.5z" fill="#8EAEBB" /><path d="M14 26h28l-.6 5H14.6z" fill="#7A9BA8" />
                  <path d="M42 32l13-11 3 3-12 13z" fill="#8EAEBB" /><circle cx="57" cy="22" r="3.5" fill="#7A9BA8" />
                  <path d="M20 26c0-8 4-12 8-12s8 4 8 12" fill="none" stroke="#7A9BA8" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M24 40c2 3 8 3 10 0" stroke="#F8F4EB" strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="23" cy="36" r="1.8" fill="#F8F4EB" /><circle cx="35" cy="36" r="1.8" fill="#F8F4EB" />
                </svg>
                <span className="absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full font-hand text-sm font-bold text-white shadow-[0_0_0_3px_#EEF2EA]" style={{ background: child.avatar_color }}>{child.nickname.slice(-1)}</span>
                {waiting > 0 && <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-gold px-1.5 text-sm font-bold text-[#4A3F2E] shadow-[0_0_0_3px_#EEF2EA]">💧{waiting}</span>}
              </button>
              <div className="min-w-0 flex-1">
                <p className="h-hand text-[17px] leading-snug">{child.nickname}的小水壺</p>
                <p className="text-[13px] leading-relaxed text-ink-soft">{waiting > 0 ? <>有 <b className="text-ink">{waiting}</b> 筆新紀錄，等{child.nickname}來澆水</> : `點水壺進入孩子模式：澆水、選心情、找故事葉`}</p>
              </div>
            </div>
          )}
          <p className="mt-1 text-center text-[13px] text-bark">{Number(ym.slice(5, 7))} 月的森林：{season.text}</p>

          {visitors.length > 0 && (
            <div className="mt-3 rounded-2xl bg-[#F3ECDA] px-4 py-3 text-center text-[13.5px]">有 <b>{visitors.length}</b> 位英文森林訪客來了！<br /><span className="hint">每讀一本英文書，就會有一位小動物來教一個英文單字。點點看牠們。</span></div>
          )}
          {fruits > 0 && (
            <div className="notice mt-3 text-center">樹上{sp.verb || '結了'} <b>{fruits}</b> {sp.unit || '顆'}{sp.fruitName}！<br /><span className="hint">重讀的書、爸媽標成最喜歡的書，還有森林偶爾送來的驚喜，都會{sp.verb ? '開花' : '結果實'}。點點看是哪一本。</span></div>
          )}

          <div className={`mt-4 grid gap-2 text-center ${flowers.length ? "grid-cols-4" : "grid-cols-3"}`}>
            {[['不同繪本', bookLeaves.length], ...(flowers.length ? [['雜誌', flowers.length]] : []), ['共讀次數', rows.length], ['共讀天數', new Set(rows.map((r) => r.read_on)).size]].map(([t, v]) => (
              <div key={t} className="rounded-2xl bg-paper-2 py-2.5"><b className="h-hand block text-2xl tabular-nums">{v}</b><span className="text-xs text-ink-soft">{t}</span></div>
            ))}
          </div>

          {leaves.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                {CATEGORIES.map((c) => (
                  <span key={c.id} className={`flex min-w-0 items-center gap-1.5 ${counts[c.id] ? '' : 'opacity-40'}`}>
                    <i className="h-[9px] w-3.5 shrink-0 rounded-[9px_1px_9px_1px]" style={{ background: c.color }} />
                    <span className="truncate">{c.name}</span><em className="ml-auto not-italic tabular-nums text-ink-soft">{counts[c.id] || 0}</em>
                  </span>
                ))}
                {counts.none > 0 && <span className="flex items-center gap-1.5"><i className="h-[9px] w-3.5 rounded-[9px_1px_9px_1px]" style={{ background: UNKNOWN_CAT.color }} />待確認分類<em className="ml-auto not-italic text-ink-soft">{counts.none}</em></span>}
              </div>
              <h3 className="h-hand mb-2 mt-6 text-lg">這個月讀的書{flowers.length > 0 && <span className="ml-2 text-xs font-normal text-ink-soft">🌼 是雜誌</span>}</h3>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
                {[...leaves].reverse().map((l) => (
                  <button key={l.id} className="w-[76px] shrink-0 text-left" onClick={() => setOpenId(l.id)}>
                    <Cover book={l.book} categoryId={l.cat} size="xs" count={l.count > 1 ? `×${l.count}` : ''} />
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-snug">{l.mag && '🌼 '}{l.book.title}</span>
                  </button>
                ))}
              </div>
            </>
          ) : !needsPick && (
            <div className="py-6 text-center text-sm leading-relaxed text-ink-soft">
              {isCurrent ? <>小{sp.name.replace('樹', '')}苗在等第一片葉子。<br />讀完一本書就會發芽。</> : '這個月沒有共讀紀錄，樹安靜地休息了。'}
              {isCurrent && <div className="mt-3"><button className="btn" onClick={onAdd}>＋ 記錄今天讀的繪本</button></div>}
            </div>
          )}
          <p className="hint mt-4 text-center">樹的大小只是紀錄的樣子，不是要達成的目標。<br />同一本書這個月又讀了，葉子會亮起微光，不會多長一片。</p>
        </>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="這個月要種哪一棵樹？">
        <div className="grid grid-cols-2 gap-2.5">
          {SPECIES_LIST.map((s) => (
            <button key={s.id} onClick={() => pick(s.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-[1.5px] px-2 pb-3 pt-2 text-center ${choice === s.id ? 'border-sage bg-sage-mist' : 'border-line bg-paper-card'}`}>
              <svg viewBox="-22 -20 44 34" className="h-16 w-20" dangerouslySetInnerHTML={{ __html: `<defs><radialGradient id="fruitShade" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#3E3832" stop-opacity=".2"/></radialGradient></defs><path d="${s.leaf}" fill="#83A48A" transform="translate(-20,-8) rotate(-25) scale(.9)"/><path d="${s.leaf}" fill="#A5B6A0" transform="translate(2,-12) rotate(20) scale(.8)"/>${s.fruit(0, 2)}` }} />
              <b className="h-hand text-[17px]">{s.name}</b>
              <span className="text-[12px] leading-snug text-ink-soft">{s.line}</span>
            </button>
          ))}
        </div>
        <p className="hint mt-3 text-center">長出第一片葉子之前都可以換。下個月可以再選新的樹。</p>
      </Sheet>

      {kid && rows && (
        <KidMode child={child} ym={ym} speciesId={speciesId} choice={choice} rows={rows} setRows={setRows}
          onPickTree={pick} onExit={() => { setKid(false); onChanged() }} />
      )}
      <VisitorCard visitor={guest} onClose={() => setGuest(null)} />
      <LeafDetail leaf={open} sp={sp} ym={ym} child={child} family={family} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged() }} />
    </div>
  )
}

function topMood(moods) {
  if (!moods.length) return null
  const c = {}
  moods.forEach((m) => (c[m] = (c[m] || 0) + 1))
  return Number(Object.entries(c).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0])
}

function LeafDetail({ leaf, sp, ym, child, family, onClose, onChanged }) {
  const [busy, setBusy] = useState(false)
  if (!leaf) return null
  const c = catOf(leaf.cat)
  const notes = leaf.sessions.map((s) => s.note).filter(Boolean)
  async function again() {
    setBusy(true)
    try {
      const { newLeaf } = await addSession({ childBookId: leaf.id, childId: child.id, bookId: leaf.book.id, familyId: family.id, readOn: ymd() })
      toast(newLeaf ? '記好了！樹上多了一個花苞，等孩子來澆水 💧' : '又讀了一次！葉子亮起微光 ✨')
      onChanged(); onClose()
    } catch (e) { toast(zhError(e)) } finally { setBusy(false) }
  }
  return (
    <Sheet open onClose={onClose} title={leaf.fruit ? `故事${sp.fruitName}` : '故事葉'}>
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
        <Cover book={leaf.book} categoryId={leaf.cat} size="md" />
        <div className="min-w-0">
          <h4 className="text-[17px] font-medium leading-snug">{leaf.book.title}</h4>
          <p className="mt-0.5 text-[13px] text-ink-soft">{leaf.book.authors?.join('、')}</p>
          <span className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[12.5px] text-white" style={{ background: c.color }}>{c.name}</span>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-ink-soft">這個月初讀</dt><dd>{dayLabel(leaf.first)}</dd>
        <dt className="text-ink-soft">本月共讀</dt><dd>{leaf.count} 次{leaf.count > 1 && ' ✨ 葉子亮起微光'}</dd>
        <dt className="text-ink-soft">孩子的喜歡</dt><dd>{leaf.topMood ? `${MOODS[leaf.topMood].e} ${MOODS[leaf.topMood].t}` : '還沒選'}</dd>
        <dt className="text-ink-soft">家長備註</dt><dd>{[...notes, leaf.parentNote].filter(Boolean).map((n, i) => <span key={i} className="block">「{n}」</span>)}{!notes.length && !leaf.parentNote && '—'}</dd>
      </dl>
      {leaf.fruit && <div className="notice mt-4">{sp.verb ? '開出' : '結出了'}{sp.fruitName}：{FRUIT_REASON_TEXT[leaf.fruitWhy]}。</div>}
      {ym === ymOf(ymd()) && <button className="btn-gold btn-block mt-4" disabled={busy} onClick={again}>{busy ? '記錄中…' : '今天又讀了這本'}</button>}
      <p className="hint mt-3">要補記孩子的喜歡程度，可以到「繪本書房」點這本書。</p>
    </Sheet>
  )
}
