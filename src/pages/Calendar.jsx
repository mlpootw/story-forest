import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { catOf, ymd, ymOf, daysInMonth, shiftMonth, monthLabel, dayLabel, MOODS } from '../lib/books'
import Cover from '../components/Cover'

export default function Calendar({ child, refresh, onChanged, onAddOn }) {
  const today = ymd()
  const [ym, setYm] = useState(ymOf(today))
  const [day, setDay] = useState(today)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    const { data, error: err } = await supabase.from('reading_sessions')
      .select('*, child_books(category_id, cover_url), books(id, title, cover_url, kind)')
      .eq('child_id', child.id).gte('read_on', ym + '-01').lt('read_on', shiftMonth(ym, 1) + '-01')
      .order('read_on').order('created_at')
    if (err) return setError(zhError(err))
    setRows(data.map((r) => { const c = r.issue_cover_url || r.child_books?.cover_url; return c ? { ...r, books: { ...r.books, cover_url: c } } : r }))
  }, [child.id, ym])
  useEffect(() => { load() }, [load, refresh])

  const byDay = {}
  rows?.forEach((r) => (byDay[r.read_on] = byDay[r.read_on] || []).push(r))
  const [y, m] = ym.split('-').map(Number)
  const first = new Date(y, m - 1, 1).getDay()
  const n = daysInMonth(ym)
  const monthCount = (cbId) => rows.filter((r) => r.child_book_id === cbId).length
  const distinct = rows ? new Set(rows.map((r) => r.child_book_id)).size : 0
  const sel = day && day.startsWith(ym) ? day : null

  async function del(id) {
    const { error: err } = await supabase.from('reading_sessions').delete().eq('id', id)
    if (err) return toast(zhError(err))
    toast('已刪除這筆紀錄')
    setConfirmDel(null)
    load(); onChanged()
  }

  return (
    <div>
      <div className="mb-1 mt-1 flex items-center justify-between">
        <button className="h-10 w-10 rounded-full border border-line text-lg" aria-label="上個月" onClick={() => { setYm(shiftMonth(ym, -1)); setDay(null) }}>‹</button>
        <h2 className="h-hand text-[22px]">{monthLabel(ym)}</h2>
        <button className="h-10 w-10 rounded-full border border-line text-lg disabled:opacity-30" aria-label="下個月" disabled={shiftMonth(ym, 1) > ymOf(today)} onClick={() => { setYm(shiftMonth(ym, 1)); setDay(null) }}>›</button>
      </div>

      <div className="mb-1 mt-3 grid grid-cols-7 text-center text-xs text-ink-soft">{'日一二三四五六'.split('').map((d) => <span key={d}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }, (_, i) => <span key={'e' + i} />)}
        {Array.from({ length: n }, (_, i) => {
          const ds = `${ym}-${String(i + 1).padStart(2, '0')}`
          const list = byDay[ds] || []
          const future = ds > today
          const isSel = ds === sel
          const color = list.length ? catOf(list[0].child_books?.category_id).color : null
          return (
            <button key={ds} disabled={future} onClick={() => setDay(ds)} aria-label={`${dayLabel(ds)}${list.length ? `，共讀 ${list.length} 次` : ''}`}
              className={`relative flex aspect-[1/1.08] flex-col items-center gap-0.5 rounded-xl pt-1.5 tabular-nums disabled:opacity-35 ${isSel ? 'bg-sage text-white' : list.length ? 'bg-sage-mist' : ''}`}>
              <span className={`grid h-6 w-6 place-items-center text-sm ${ds === today && !isSel ? 'rounded-full border-[1.5px] border-gold' : ''}`}>{i + 1}</span>
              {list.length > 0 && (
                <span className="flex items-center gap-px">
                  <svg width="14" height="9" viewBox="0 0 19 12"><path d="M0,6 C5,-.5 13,-1 19,6 C13,13 5,12.5 0,6Z" fill={isSel ? '#fff' : color} /></svg>
                  {list.length > 1 && <span className={`text-[10.5px] font-bold ${isSel ? 'text-white' : 'text-sage-deep'}`}>{list.length}</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && <div className="error-box mt-4">{error} <button className="underline" onClick={load}>重試</button></div>}
      {rows && (
        <div className="mt-3 flex justify-center gap-5 text-[13px] text-ink-soft">
          <span>共讀天數 <b className="text-base tabular-nums text-ink">{Object.keys(byDay).length}</b></span>
          <span>共讀次數 <b className="text-base tabular-nums text-ink">{rows.length}</b></span>
          <span>不同繪本 <b className="text-base tabular-nums text-ink">{distinct}</b></span>
        </div>
      )}

      {sel ? (
        <section className="mt-4 border-t border-dashed border-line pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="h-hand text-[17px]">{dayLabel(sel)}</h3>
            <button className="btn-ghost px-3 py-1 text-[13px]" onClick={() => onAddOn(sel)}>{sel === today ? '＋ 記錄' : '＋ 補登這天'}</button>
          </div>
          {!rows ? <p className="py-6 text-center text-sm text-ink-soft">載入中…</p>
            : (byDay[sel] || []).length ? (byDay[sel].map((r) => (
              <div key={r.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5">
                <Cover book={r.books} categoryId={r.child_books?.category_id} size="xs" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.books.title}</div>
                  <div className="text-[12.5px] text-ink-soft">{r.mood ? `${MOODS[r.mood].e} ${MOODS[r.mood].t}` : '還沒記心情'} · 本月共讀 {monthCount(r.child_book_id)} 次</div>
                  {r.issue && <div className="mt-0.5 text-[12.5px] text-ink-soft">🌼 {r.issue}{r.has_english ? ' · 有讀英文 🐰' : ''}</div>}
                  {r.note && <div className="mt-0.5 text-[12.5px] text-bark">「{r.note}」</div>}
                </div>
                {confirmDel === r.id
                  ? <span className="flex flex-col items-end gap-1"><button className="btn-danger px-2.5 py-1 text-xs" onClick={() => del(r.id)}>刪除</button><button className="text-xs text-ink-soft" onClick={() => setConfirmDel(null)}>取消</button></span>
                  : <button className="px-1 text-xs text-ink-soft" onClick={() => setConfirmDel(r.id)}>刪除</button>}
              </div>
            ))) : <p className="py-6 text-center text-sm leading-relaxed text-ink-soft">這天沒有共讀紀錄。<br />想起來讀過哪本，可以補登。</p>}
        </section>
      ) : <p className="hint mt-4 text-center">點選日期，看那天讀了哪些書</p>}
    </div>
  )
}
