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

export default function Garden({ child, family, refresh, onChanged, onAdd }) {
  const thisMonth = ymOf(ymd())
  const [ym, setYm] = useState(thisMonth)
  const [rows, setRows] = useState(null)
  const [choice, setChoice] = useState(undefined)
  const [error, setError] = useState('')
  const [picker, setPicker] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [zoom, setZoom] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const [s, t] = await Promise.all([
      supabase.from('reading_sessions')
        .select('id, read_on, mood, note, child_book_id, child_books(category_id, parent_note), books(id, title, cover_url, authors)')
        .eq('child_id', child.id).gte('read_on', ym + '-01').lt('read_on', shiftMonth(ym, 1) + '-01').order('read_on'),
      supabase.from('tree_choices').select('species').eq('child_id', child.id).eq('month', ym + '-01').maybeSingle()
    ])
    if (s.error) return setError(zhError(s.error))
    setRows(s.data)
    setChoice(t.error ? null : t.data?.species || null) // 還沒執行第四階段 SQL 時，仍可正常顯示
  }, [child.id, ym])
  useEffect(() => { setRows(null); setChoice(undefined); setZoom(false); load() }, [load, refresh])

  // 每本書在這個月是一片葉子
  const leaves = useMemo(() => {
    if (!rows) return []
    const m = new Map()
    for (const r of rows) {
      if (!m.has(r.child_book_id)) m.set(r.child_book_id, { id: r.child_book_id, book: r.books, cat: r.child_books?.category_id, parentNote: r.child_books?.parent_note, sessions: [] })
      m.get(r.child_book_id).sessions.push(r)
    }
    return [...m.values()].map((l) => {
      const moods = l.sessions.map((s) => s.mood).filter(Boolean)
      const loved = moods.includes(3)
      return { ...l, count: l.sessions.length, first: l.sessions[0].read_on, loved, fruit: loved || l.sessions.length >= 2, topMood: topMood(moods) }
    })
  }, [rows])

  const isCurrent = ym === thisMonth
  const speciesId = choice || SPECIES_LIST[hashStr(child.id + ym) % SPECIES_LIST.length].id
  const sp = SPECIES[speciesId]
  const canChange = isCurrent && (!choice || leaves.length === 0)
  const needsPick = isCurrent && choice === null
  const stage = stageOf(leaves.length)
  const season = SEASONS[Number(ym.slice(5, 7))]
  const fruits = leaves.filter((l) => l.fruit).length
  const counts = {}
  leaves.forEach((l) => { const k = l.cat || 'none'; counts[k] = (counts[k] || 0) + 1 })
  const open = leaves.find((l) => l.id === openId)

  async function pick(id) {
    const { error: err } = await supabase.from('tree_choices').upsert({ child_id: child.id, family_id: family.id, month: ym + '-01', species: id }, { onConflict: 'child_id,month' })
    if (err) return toast(/tree_choices|relation|schema cache/i.test(err.message) ? '請先到 Supabase 執行第四階段的更新 SQL' : zhError(err))
    setChoice(id); setPicker(false)
    toast(`${child.nickname}這個月種下了${SPECIES[id].name} 🌱`)
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
            {sp.name}{leaves.length ? ` · ${leaves.length} 片故事葉` : ''} · <b className="h-hand text-[15px] text-sage-deep">{STAGES[stage]}</b>
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
              {leaves.length > 18 && (
                <button className="absolute right-2 top-2 z-10 rounded-full border border-line bg-paper/90 px-3 py-1 text-[12.5px]" onClick={() => setZoom(!zoom)}>{zoom ? '縮小' : '放大看葉子'}</button>
              )}
              <ReadingTree childId={child.id} ym={ym} speciesId={speciesId} leaves={leaves} zoom={zoom} onPick={setOpenId} />
            </div>
          )}

          <p className="mt-1 text-center text-[13px] text-bark">{Number(ym.slice(5, 7))} 月的森林：{season.text}</p>

          {fruits > 0 && (
            <div className="notice mt-3 text-center">樹上{sp.verb || '結了'} <b>{fruits}</b> {sp.unit || '顆'}{sp.fruitName}！<br /><span className="hint">孩子選了「😍 好喜歡」或這個月讀了 2 次以上的書，就會{sp.verb ? '開花' : '結果實'}。點點看是哪一本。</span></div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[['不同繪本', leaves.length], ['共讀次數', rows.length], ['共讀天數', new Set(rows.map((r) => r.read_on)).size]].map(([t, v]) => (
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
              <h3 className="h-hand mb-2 mt-6 text-lg">這個月的故事葉</h3>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
                {[...leaves].reverse().map((l) => (
                  <button key={l.id} className="w-[76px] shrink-0 text-left" onClick={() => setOpenId(l.id)}>
                    <Cover book={l.book} categoryId={l.cat} size="xs" count={l.count > 1 ? `×${l.count}` : ''} />
                    <span className="mt-1 line-clamp-2 block text-[12px] leading-snug">{l.book.title}</span>
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
      toast(newLeaf ? '這個月第一次讀，樹上多一片葉子 🌱' : '又讀了一次！葉子亮起微光 ✨')
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
      {leaf.fruit && <div className="notice mt-4">{sp.verb ? '開出' : '結出了'}{sp.fruitName}：{leaf.loved ? '孩子選了「😍 好喜歡」' : '這個月讀了 2 次以上'}。</div>}
      {ym === ymOf(ymd()) && <button className="btn-gold btn-block mt-4" disabled={busy} onClick={again}>{busy ? '記錄中…' : '今天又讀了這本'}</button>}
      <p className="hint mt-3">要補記孩子的喜歡程度，可以到「繪本書房」點這本書。</p>
    </Sheet>
  )
}
