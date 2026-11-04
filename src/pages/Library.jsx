import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { CATEGORIES, catOf, ymd, dayLabel, MOODS, suggestCategory } from '../lib/books'
import { addSession, uploadCover } from '../lib/records'
import CoverCamera from '../components/CoverCamera'
import Cover from '../components/Cover'
import { Sheet } from '../components/ui'
import { isEnglishBook } from '../lib/visitors'
import ShareSheet from '../components/ShareSheet'

export default function Library({ child, family, refresh, onChanged, onAdd }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [catF, setCatF] = useState('all')
  const [sort, setSort] = useState('recent')
  const [openId, setOpenId] = useState(null)
  const [share, setShare] = useState(null) // null | { ids }

  const load = useCallback(async () => {
    setError('')
    const { data, error: err } = await supabase.from('child_books')
      .select('id, category_id, is_favorite, parent_note, is_english, cover_url, created_at, books(*), reading_sessions(*)')
      .eq('child_id', child.id)
    if (err) return setError(zhError(err))
    setItems(data.map((x) => {
      const ss = [...x.reading_sessions].sort((a, b) => (a.read_on < b.read_on ? 1 : -1))
      const moods = ss.map((s) => s.mood).filter(Boolean)
      // 家庭自己拍的封面優先
      const books = x.cover_url ? { ...x.books, cover_url: x.cover_url, original_cover: x.books.cover_url } : x.books
      return { ...x, books, sessions: ss, count: ss.length, last: ss[0]?.read_on || '', love: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0 }
    }))
  }, [child.id])
  useEffect(() => { load() }, [load, refresh])

  const list = useMemo(() => {
    if (!items) return []
    let L = items
    const k = q.trim()
    if (k) L = L.filter((x) => x.books.title.includes(k) || (x.books.authors || []).join(' ').includes(k))
    if (catF !== 'all') L = L.filter((x) => (catF === 'none' ? !x.category_id : x.category_id === catF))
    const by = { recent: (a, b) => (a.last < b.last ? 1 : -1), love: (a, b) => b.is_favorite - a.is_favorite || b.love - a.love || b.count - a.count, reread: (a, b) => b.count - a.count || (a.last < b.last ? 1 : -1) }
    return [...L].sort(by[sort])
  }, [items, q, catF, sort])

  const hasUnknown = items?.some((x) => !x.category_id)
  const open = items?.find((x) => x.id === openId)
  const favs = items?.filter((x) => x.is_favorite) || []

  if (error) return <div className="error-box mt-4">{error} <button className="underline" onClick={load}>重試</button></div>
  if (!items) return <p className="py-16 text-center text-sm text-ink-soft">正在打開書房…</p>
  if (!items.length) return (
    <div className="py-14 text-center text-sm leading-relaxed text-ink-soft">
      {child.nickname}的書房還是空的。<br />掃描或搜尋一本今天讀的繪本吧！
      <div className="mt-4"><button className="btn" onClick={onAdd}>＋ 新增繪本</button></div>
    </div>
  )

  return (
    <div>
      <div className="mt-2 flex items-center gap-2 rounded-full border border-line bg-paper-card px-4 py-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A7E70" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
        <input id="lib-search" type="search" className="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜尋書名或作者" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 pt-3 [scrollbar-width:none]">
        <Chip on={catF === 'all'} onClick={() => setCatF('all')}>全部 {items.length}</Chip>
        {CATEGORIES.map((c) => <Chip key={c.id} on={catF === c.id} color={c.color} onClick={() => setCatF(c.id)}>{c.name}</Chip>)}
        {hasUnknown && <Chip on={catF === 'none'} color="#C9BFAF" onClick={() => setCatF('none')}>待確認分類</Chip>}
      </div>
      <button onClick={() => (favs.length ? setShare({ ids: null }) : toast('還沒有 ♥ 最喜歡的書。點一本書，按「♡ 標為最喜歡」就能加入書單'))}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[#F6E9EC] px-4 py-3 text-left active:scale-[.99]">
        <span className="text-2xl">♥</span>
        <span className="min-w-0 flex-1"><b className="block text-[15px]">分享最愛書單</b>
          <span className="text-[12.5px] text-ink-soft">{favs.length ? `${favs.length} 本 ♥ 最喜歡的書，排成圖卡傳到 LINE` : '在書的資料頁按「♡ 標為最喜歡」，就能分享'}</span></span>
        <span className="rounded-full bg-[#06C755] px-3 py-1 text-xs font-bold text-white">LINE</span>
      </button>
      <div className="my-3 flex rounded-full bg-paper-2 p-1">
        {[['recent', '最近閱讀'], ['love', '最喜歡'], ['reread', '最常重讀']].map(([k, t]) => (
          <button key={k} onClick={() => setSort(k)} className={`flex-1 rounded-full py-1.5 text-[13px] ${sort === k ? 'bg-paper-card font-medium shadow-sm' : ''}`}>{t}</button>
        ))}
      </div>
      {list.length ? (
        <div className="grid grid-cols-3 gap-x-3 gap-y-4">
          {list.map((x) => (
            <button key={x.id} className="min-w-0 text-left" onClick={() => setOpenId(x.id)}>
              <Cover book={x.books} categoryId={x.category_id} size="sm" count={x.count > 1 ? `讀過 ${x.count} 次` : ''} />
              <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-snug">{x.is_favorite && <span className="text-[#C88F99]">♥ </span>}{x.books.kind === 'magazine' && '🌼 '}{x.books.title}</span>
            </button>
          ))}
        </div>
      ) : <p className="py-10 text-center text-sm text-ink-soft">沒有符合條件的書，換個關鍵字或分類試試。</p>}

      <BookDetail item={open} child={child} family={family} onClose={() => setOpenId(null)} onChanged={() => { load(); onChanged() }}
        onShare={() => { setShare({ ids: [open.id], single: true }); setOpenId(null) }} />
      <ShareSheet open={!!share} onClose={() => setShare(null)} child={child}
        items={share?.single ? items.filter((x) => share.ids.includes(x.id)) : favs} initialIds={share?.ids || null} />
    </div>
  )
}

function Chip({ on, color, onClick, children }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${on ? 'border-ink bg-ink text-paper' : 'border-line'}`}>
      {color && <i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}{children}
    </button>
  )
}

function BookDetail({ item, child, family, onClose, onChanged, onShare }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [cam, setCam] = useState(false)
  useEffect(() => { setNote(item?.parent_note || ''); setConfirmRemove(false); setConfirmDel(null) }, [item?.id])
  if (!item) return null
  const b = item.books

  async function run(key, fn, ok) {
    setBusy(key)
    const { error } = await fn()
    setBusy('')
    if (error) return toast(zhError(error))
    if (ok) toast(ok)
    onChanged()
  }
  async function saveCover(file) {
    setCam(false)
    setBusy('cover')
    try {
      const url = await uploadCover(family.id, file)
      const { error } = await supabase.from('child_books').update({ cover_url: url }).eq('id', item.id)
      if (error) throw error
      toast('封面換好了')
      onChanged()
    } catch (e) { toast(/cover_url|schema cache/i.test(e.message || '') ? '請先到 Supabase 執行封面的更新 SQL' : zhError(e)) } finally { setBusy('') }
  }
  async function readToday() {
    setBusy('again')
    try {
      const { newLeaf } = await addSession({ childBookId: item.id, childId: child.id, bookId: b.id, familyId: family.id, readOn: ymd() })
      toast(newLeaf ? '記好了！樹上多了一個花苞，等孩子來澆水 💧' : '又讀了一次！葉子會亮起微光 ✨')
      onChanged()
    } catch (e) { toast(zhError(e)) } finally { setBusy('') }
  }

  return (
    <Sheet open onClose={onClose} title="繪本資料">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
        <div>
          <Cover book={b} categoryId={item.category_id} size="md" />
          <button className="mt-1.5 w-full text-center text-[12px] text-bark underline" disabled={busy === 'cover'} onClick={() => setCam(true)}>{busy === 'cover' ? '上傳中…' : '📷 換封面'}</button>
          {item.cover_url && <button className="w-full text-center text-[11px] text-ink-soft underline" onClick={() => run('cover0', () => supabase.from('child_books').update({ cover_url: null }).eq('id', item.id), '已恢復原本封面')}>恢復原本封面</button>}
        </div>
        <div className="min-w-0">
          <h4 className="text-[17px] font-medium leading-snug">{b.title}</h4>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{b.authors?.join('、') || '作者不詳'}{b.publisher && ` · ${b.publisher}`}<br />ISBN {b.isbn13 || '—'}</p>
          <button className="btn-ghost mt-2 px-3 py-1 text-[13px]" disabled={busy === 'fav'}
            onClick={() => run('fav', () => supabase.from('child_books').update({ is_favorite: !item.is_favorite }).eq('id', item.id))}>
            {item.is_favorite ? '♥ 最喜歡的書' : '♡ 標為最喜歡'}</button>
        </div>
      </div>
      {b.description && <p className="mt-3 line-clamp-5 rounded-xl bg-paper-2 px-3 py-2.5 text-[13px] leading-relaxed">{b.description}</p>}

      <div className="mt-4 flex gap-2">
        <button className="btn-gold flex-1 py-3" disabled={busy === 'again'} onClick={readToday}>{busy === 'again' ? '記錄中…' : '今天又讀了這本'}</button>
        <button className="btn shrink-0 bg-[#06C755] px-4 py-3" onClick={onShare}>分享這本</button>
      </div>

      <p className="mb-1 mt-5 text-[13px] text-ink-soft">主要分類（決定葉子顏色）{!item.category_id && <b className="ml-1 text-bark">目前：待確認</b>}</p>
      {!item.category_id && suggestCategory(b) && (
        <div className="notice mb-2 flex items-center gap-2">
          <span className="flex-1">建議分類：<b>{catOf(suggestCategory(b).id).name}</b><span className="hint block">依書名「{suggestCategory(b).hits.join('、')}」判斷</span></span>
          <button className="btn shrink-0 px-3 py-1.5 text-sm" onClick={() => run('cat', () => supabase.from('child_books').update({ category_id: suggestCategory(b).id }).eq('id', item.id), '分類已更新')}>套用</button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {CATEGORIES.map((c) => (
          <button key={c.id} disabled={!!busy}
            onClick={() => c.id !== item.category_id && run('cat', () => supabase.from('child_books').update({ category_id: c.id }).eq('id', item.id), '分類已更新')}
            className={`flex items-center gap-2 rounded-xl border-[1.5px] px-2.5 py-2 text-left text-[13px] leading-tight ${item.category_id === c.id ? 'border-ink bg-paper-card font-bold' : 'border-line'}`}>
            <i className="h-3 w-3 shrink-0 rounded-[12px_2px_12px_2px]" style={{ background: c.color }} />{c.name}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-paper-2 px-4 py-3">
        <p className="text-sm">英文書<span className="block text-xs text-ink-soft">英文書會帶一位森林訪客來教單字</span></p>
        <button role="switch" aria-checked={isEnglishBook(item, b)} aria-label="英文書" disabled={!!busy}
          onClick={() => run('en', () => supabase.from('child_books').update({ is_english: !isEnglishBook(item, b) }).eq('id', item.id), '已更新')}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${isEnglishBook(item, b) ? 'bg-sage' : 'bg-paper-3'}`}>
          <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${isEnglishBook(item, b) ? 'left-[23px]' : 'left-[3px]'}`} />
        </button>
      </div>

      <label className="field mt-5">家長觀察備註（例如孩子最喜歡哪一頁）
        <textarea id="parent-note" className="input h-20" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {note !== (item.parent_note || '') && (
        <button className="btn mt-2 px-4 py-1.5 text-sm" disabled={busy === 'note'} onClick={() => run('note', () => supabase.from('child_books').update({ parent_note: note.trim() || null }).eq('id', item.id), '備註已儲存')}>儲存備註</button>
      )}

      <h4 className="h-hand mb-1 mt-6 text-base">共讀紀錄 · {item.count} 次</h4>
      <ul>
        {item.sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-2 border-b border-line py-2 text-[13.5px]">
            <span className="w-20 shrink-0 tabular-nums">{dayLabel(s.read_on)}{s.issue && <small className="block text-[11px] leading-tight text-ink-soft">{s.issue}{s.has_english ? ' 🐰' : ''}</small>}</span>
            <span className="flex flex-1 gap-0.5">
              {[3, 2, 1].map((m) => (
                <button key={m} aria-label={MOODS[m].t} title={MOODS[m].t}
                  onClick={() => run('mood', () => supabase.from('reading_sessions').update({ mood: s.mood === m ? null : m }).eq('id', s.id))}
                  className={`rounded-full px-1 text-lg leading-none ${s.mood === m ? 'bg-[#F6EDD3]' : 'opacity-30'}`}>{MOODS[m].e}</button>
              ))}
            </span>
            {confirmDel === s.id
              ? <span className="flex gap-1"><button className="px-1 text-xs text-ink-soft" onClick={() => setConfirmDel(null)}>取消</button>
                  <button className="btn-danger px-2.5 py-1 text-xs" onClick={() => run('del', () => supabase.from('reading_sessions').delete().eq('id', s.id), '已刪除這筆紀錄')}>刪除</button></span>
              : <button className="px-1 text-xs text-ink-soft" onClick={() => setConfirmDel(s.id)}>刪除</button>}
          </li>
        ))}
      </ul>
      <p className="hint mt-1">點表情可以補記孩子當天的喜歡程度。</p>

      <div className="mt-6 border-t border-dashed border-line pt-4">
        {!confirmRemove
          ? <button className="text-[13px] text-danger underline" onClick={() => setConfirmRemove(true)}>從書房移除這本書</button>
          : <div className="error-box">會一併刪除這本書的 {item.count} 筆共讀紀錄，無法復原。
              <div className="mt-3 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setConfirmRemove(false)}>取消</button>
                <button className="btn-danger flex-1" onClick={() => run('rm', () => supabase.from('child_books').delete().eq('id', item.id), '已從書房移除').then(onClose)}>確定移除</button></div>
            </div>}
      </div>
      {cam && <CoverCamera onDone={(f) => saveCover(f)} onClose={() => setCam(false)} />}
    </Sheet>
  )
}
