import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/toast'
import { zhError } from '../lib/errors'
import { ymd } from '../lib/books'

// 媽媽看的書：每天「今天看了」簽到，累積連續天數（獨立於孩子的樹）
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d) }
const mdOf = (d) => { const [, m, day] = String(d).split('-'); return `${+m}/${+day}` }
const daysLeft = (d) => Math.round((new Date(d + 'T00:00:00') - new Date(ymd() + 'T00:00:00')) / 864e5)
const WK = '日一二三四五六'

export default function MomShelf({ family, session, books }) {
  const [reads, setReads] = useState(null) // [{ book_id, read_on }]
  const [busyIds, setBusyIds] = useState([])
  const lock = useRef(new Set())
  const today = ymd()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('mom_reads').select('book_id, read_on').eq('family_id', family.id).gte('read_on', addDays(today, -400)).order('read_on', { ascending: false }).limit(5000)
    setReads(error ? [] : data)
  }, [family.id, today])
  useEffect(() => { load() }, [load])

  const days = useMemo(() => new Set((reads || []).map((r) => r.read_on)), [reads])
  const doneToday = useMemo(() => new Set((reads || []).filter((r) => r.read_on === today).map((r) => r.book_id)), [reads, today])
  // 連續天數：今天還沒簽到時，從昨天往回算（不會因為今天還沒看就歸零）
  const streak = useMemo(() => {
    let d = days.has(today) ? today : addDays(today, -1), n = 0
    while (days.has(d)) { n++; d = addDays(d, -1) }
    return n
  }, [days, today])
  const monthDays = useMemo(() => [...days].filter((d) => d.slice(0, 7) === today.slice(0, 7)).length, [days, today])
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  async function toggle(bookId) {
    if (reads === null || lock.current.has(bookId)) return
    lock.current.add(bookId); setBusyIds((b) => [...b, bookId])
    const day = ymd()
    const had = reads.some((r) => r.book_id === bookId && r.read_on === day)
    const hadToday = reads.some((r) => r.read_on === day)
    setReads((rs) => (had ? (rs || []).filter((r) => !(r.book_id === bookId && r.read_on === day)) : [...(rs || []), { book_id: bookId, read_on: day }]))
    const { error } = had
      ? await supabase.from('mom_reads').delete().eq('family_id', family.id).eq('book_id', bookId).eq('read_on', day)
      : await supabase.from('mom_reads').insert({ family_id: family.id, book_id: bookId, read_on: day, created_by: session.user.id })
    lock.current.delete(bookId); setBusyIds((b) => b.filter((x) => x !== bookId))
    if (error) { toast(zhError(error)); load(); return }
    if (!had) { const n = streak + (hadToday ? 0 : 1); toast(n >= 2 ? `簽到成功！連續 ${n} 天了 🌿` : '簽到成功！今天也有看書 🌿') }
  }

  if (!books.length) return null
  const msg = streak === 0 ? '今天翻開一頁，就算簽到 🌿' : days.has(today) ? `今天簽到了，連續 ${streak} 天，媽媽也在長大 🌱` : `連續 ${streak} 天，今天也來看一頁吧 🌿`
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h4 className="text-[14px] font-bold">媽媽看的書 <span className="text-[12px] font-normal text-ink-soft">{books.length} 本</span></h4>
      <div className="mt-2 rounded-2xl bg-paper-2 px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14px] font-medium">{msg}</p>
          <span className="shrink-0 text-[12px] text-ink-soft">本月 {monthDays} 天</span>
        </div>
        <div className="mt-2 flex justify-between">
          {week.map((d) => (
            <div key={d} className="flex flex-col items-center gap-1">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[13px] ${days.has(d) ? 'bg-sage text-white' : d === today ? 'border-2 border-sage' : 'border border-line text-transparent'}`}>{days.has(d) ? '✓' : '·'}</span>
              <span className={`text-[11px] ${d === today ? 'font-bold text-ink' : 'text-ink-soft'}`}>{d === today ? '今天' : `週${WK[new Date(d + 'T00:00:00').getDay()]}`}</span>
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-1">
        {books.map((b) => {
          const on = doneToday.has(b.id)
          const n = daysLeft(b.due)
          return (
            <li key={b.id} className="flex items-center justify-between gap-3 border-b border-line py-2">
              <div className="min-w-0">
                <span className="block truncate text-[13.5px]">{b.title}</span>
                <span className={`text-[12px] ${n < 0 ? 'text-[#B5533C]' : n <= 3 ? 'text-[#B8863B]' : 'text-ink-soft'}`}>{n < 0 ? '已逾期' : `${mdOf(b.due)} 到期`}</span>
              </div>
              <button type="button" aria-pressed={on} disabled={reads === null || busyIds.includes(b.id)} onClick={() => toggle(b.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${on ? 'border-sage bg-sage text-white' : 'border-sage text-sage-deep'}`}>{on ? '今天看了 ✓' : '今天看了'}</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
