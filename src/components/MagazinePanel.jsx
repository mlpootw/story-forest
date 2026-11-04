import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { CATEGORIES, catOf, ymd } from '../lib/books'
import { ensureChildBook, addSession, uploadCover } from '../lib/records'
import Cover from './Cover'
import CoverCamera from './CoverCamera'

/*
  雜誌：整本雜誌在樹下是一朵花，讀越多次開得越大
  - 第一次建立雜誌（名稱＋固定分類＋代表封面），之後可以修改
  - 每次記錄：選哪一年哪一月的那一期、可拍那期封面、有讀英文單元就勾（會招來森林訪客）
*/
const PRESETS = ['小康軒學前版', '巧連智', '小牛頓', '小行星幼兒誌']
const SQL_HINT = '請先到 Supabase 執行雜誌的更新 SQL'
const needSql = (e) => /kind|issue|has_english|schema cache/i.test(e?.message || '')

export default function MagazinePanel({ session, family, children, childId, setChildId, date, setDate, presetIssn, onSaved, onClose }) {
  const now = new Date()
  const [mags, setMags] = useState(null)
  const [mode, setMode] = useState(presetIssn ? 'create' : 'list') // list | create | edit
  const [selId, setSelId] = useState(null)
  const [form, setForm] = useState({ title: '', cat: 'cognition', issn: presetIssn || '' })
  const [cover, setCover] = useState(null) // 建立／修改時的代表封面 { file, preview }
  const [cam, setCam] = useState(null) // 'mag' | 'issue'
  // 這次讀的那一期
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [extraNote, setExtraNote] = useState('')
  const [issueCover, setIssueCover] = useState(null)
  const [english, setEnglish] = useState(false)
  const [busy, setBusy] = useState('')

  async function load(selectId) {
    const { data, error } = await supabase.from('books').select('id, title, cover_url, issn, child_books(id, child_id, category_id, cover_url)')
      .eq('owner_family_id', family.id).eq('kind', 'magazine').order('created_at')
    if (error) { setMags([]); if (needSql(error)) toast(SQL_HINT); return }
    setMags(data)
    setSelId((cur) => selectId || cur || data[0]?.id || null)
    if (!data.length && !presetIssn) setMode('create')
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (presetIssn) { setMode('create'); setForm((f) => ({ ...f, issn: presetIssn })) } }, [presetIssn])

  const catOfMag = (m) => m?.child_books?.find((c) => c.child_id === childId)?.category_id ?? m?.child_books?.find((c) => c.category_id)?.category_id ?? 'cognition'
  const sel = mags?.find((m) => m.id === selId)

  async function record() {
    if (!sel) return
    if (date > ymd()) return toast('不能記錄未來的日期')
    setBusy('rec')
    try {
      const cb = await ensureChildBook({ childId, bookId: sel.id, familyId: family.id, categoryId: catOfMag(sel) })
      const issue_cover_url = issueCover ? await uploadCover(family.id, issueCover.file) : null
      const issue = `${year} 年 ${month} 月號`
      const { newLeaf } = await addSession({
        childBookId: cb.id, childId, bookId: sel.id, familyId: family.id, readOn: date,
        note: extraNote.trim(),
        extra: { issue, issue_cover_url, has_english: english }
      })
      const name = children.find((c) => c.id === childId)?.nickname
      toast(`記好了！${sel.title} ${issue}${english ? '，有讀英文 🐰' : ''}　${newLeaf ? `樹下冒出花苞，等${name}來澆水 🌼` : '等澆水讓花長大 🌼'}`)
      onSaved?.({ childId, date })
      onClose()
    } catch (e) { toast(needSql(e) ? SQL_HINT : zhError(e)) } finally { setBusy('') }
  }

  async function create() {
    if (!form.title.trim()) return toast('請填寫雜誌名稱')
    setBusy('new')
    try {
      const cover_url = cover ? await uploadCover(family.id, cover.file) : null
      const { data, error } = await supabase.from('books').insert({
        title: form.title.trim(), kind: 'magazine', source: 'manual', owner_family_id: family.id, created_by: session.user.id,
        issn: form.issn || null, cover_url, cover_source: cover_url ? 'upload' : 'none', subjects: [], authors: []
      }).select('id').single()
      if (error) throw error
      for (const c of children) await ensureChildBook({ childId: c.id, bookId: data.id, familyId: family.id, categoryId: form.cat })
      setCover(null)
      await load(data.id)
      setMode('list')
      toast('雜誌建好了！選這次讀哪一期，再按「記好了」')
    } catch (e) { toast(needSql(e) ? SQL_HINT : zhError(e)) } finally { setBusy('') }
  }

  function startEdit(m) {
    setSelId(m.id)
    setForm({ title: m.title, cat: catOfMag(m), issn: m.issn || '' })
    setCover(null)
    setMode('edit')
  }
  async function saveEdit() {
    if (!form.title.trim()) return toast('請填寫雜誌名稱')
    setBusy('edit')
    try {
      const patch = { title: form.title.trim() }
      if (cover) { patch.cover_url = await uploadCover(family.id, cover.file); patch.cover_source = 'upload' }
      const { error } = await supabase.from('books').update(patch).eq('id', selId)
      if (error) throw error
      const { error: e2 } = await supabase.from('child_books').update({ category_id: form.cat }).eq('book_id', selId).eq('family_id', family.id)
      if (e2) throw e2
      setCover(null)
      await load(selId)
      setMode('list')
      toast('雜誌資料已更新')
      onSaved?.({ childId, date })
    } catch (e) { toast(zhError(e)) } finally { setBusy('') }
  }

  const whenRow = (
    <div className="grid grid-cols-2 gap-3">
      <label className="field">共讀日期<input id="mag-date" type="date" className="input" value={date} max={ymd()} onChange={(e) => setDate(e.target.value)} /></label>
      <label className="field">和誰一起讀
        <select id="mag-child" className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
          {children.map((c) => <option key={c.id} value={c.id}>{c.nickname}</option>)}
        </select>
      </label>
    </div>
  )
  const camera = cam && (
    <CoverCamera
      onDone={(file, preview) => { if (cam === 'issue') setIssueCover({ file, preview }); else setCover({ file, preview }); setCam(null) }}
      onClose={() => setCam(null)} />
  )

  if (!mags) return <p className="py-8 text-center text-sm text-ink-soft">載入中…</p>

  // ---- 建立／修改雜誌 ----
  if (mode === 'create' || mode === 'edit') {
    const editing = mode === 'edit'
    const current = editing ? sel : null
    return (
      <div className="flex flex-col gap-3">
        {presetIssn && !editing && <div className="notice">掃到一本新的雜誌！取個名字，之後再掃這本雜誌就會自動認出來。</div>}
        {!mags.length && !editing && (
          <div className="text-center"><div className="text-4xl">🌼</div>
            <p className="hint">雜誌會變成樹下的一朵花。不管讀哪一期都算同一朵，讀越多次開得越大。</p></div>
        )}
        <label className="field">雜誌名稱<input id="mag-title" className="input" value={form.title} placeholder="例如：小康軒學前版" onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        {!editing && (
          <div className="-mt-1 flex flex-wrap gap-1.5">
            {PRESETS.map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, title: t })}
                className={`rounded-full border px-3 py-1 text-[13px] ${form.title === t ? 'border-sage bg-sage-mist text-sage-deep' : 'border-line text-ink-soft'}`}>{t}</button>
            ))}
          </div>
        )}
        <div className="field">固定分類（花的顏色）
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => setForm({ ...form, cat: c.id })}
                className={`flex items-center gap-2 rounded-xl border-[1.5px] px-2.5 py-2 text-left text-[13px] leading-tight text-ink ${form.cat === c.id ? 'border-ink bg-paper-card font-bold' : 'border-line'}`}>
                <i className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="field">雜誌的代表封面（選填，每一期的封面可以記錄時再拍）
          <div className="flex items-center gap-3">
            {cover ? <img src={cover.preview} alt="封面預覽" className="w-14 rounded shadow" />
              : current?.cover_url ? <div className="w-14"><Cover book={current} categoryId={form.cat} size="xs" /></div> : null}
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setCam('mag')}>📷 {cover || current?.cover_url ? '換封面' : '拍封面'}</button>
          </div>
        </div>
        <div className="flex gap-2">
          {mags.length > 0 && <button className="btn-ghost" onClick={() => { setMode('list'); setCover(null) }}>返回</button>}
          {editing
            ? <button className="btn flex-1" disabled={busy === 'edit'} onClick={saveEdit}>{busy === 'edit' ? '儲存中…' : '儲存修改'}</button>
            : <button className="btn flex-1" disabled={busy === 'new'} onClick={create}>{busy === 'new' ? '建立中…' : '建立雜誌'}</button>}
        </div>
        {camera}
      </div>
    )
  }

  // ---- 記錄這次讀的那一期 ----
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-soft">讀了哪一本雜誌？</p>
      {mags.map((m) => {
        const cat = catOfMag(m)
        const mine = m.child_books?.find((c) => c.child_id === childId)
        const book = { ...m, cover_url: mine?.cover_url || m.cover_url }
        const on = m.id === selId
        return (
          <div key={m.id} role="button" tabIndex={0} onClick={() => setSelId(m.id)}
            className={`flex items-center gap-3 rounded-2xl border-2 bg-paper-card p-2.5 ${on ? 'border-sage' : 'border-line'}`}>
            <div className="w-12 shrink-0"><Cover book={book} categoryId={cat} size="xs" /></div>
            <div className="min-w-0 flex-1">
              <b className="block truncate">{m.title}</b>
              <span className="flex items-center gap-1 text-xs text-ink-soft"><i className="h-2.5 w-2.5 rounded-full" style={{ background: catOf(cat).color }} />{catOf(cat).name}</span>
            </div>
            <button className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[13px]" onClick={(e) => { e.stopPropagation(); startEdit(m) }}>✏️ 修改</button>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm font-bold ${on ? 'bg-sage text-white' : 'border border-line'}`}>{on ? '✓' : ''}</span>
          </div>
        )
      })}
      <button className="self-start text-[13px] text-bark underline" onClick={() => { setForm({ title: '', cat: 'cognition', issn: '' }); setCover(null); setMode('create') }}>＋ 新增另一本雜誌</button>

      {sel && (
        <>
          <div className="field">這次讀的是哪一期？
            <div className="grid grid-cols-2 gap-2">
              <select id="mag-year" className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
              </select>
              <select id="mag-month" className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1} 月號</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {issueCover && <img src={issueCover.preview} alt="這期封面" className="w-12 rounded shadow" />}
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setCam('issue')}>📷 {issueCover ? '重拍這期封面' : '拍這一期的封面（選填）'}</button>
          </div>
          <button type="button" onClick={() => setEnglish(!english)} aria-pressed={english}
            className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 text-left ${english ? 'border-[#8EAEBB] bg-[#EAF2F1]' : 'border-line'}`}>
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-sm font-bold ${english ? 'bg-[#5E8CA3] text-white' : 'border border-line'}`}>{english ? '✓' : ''}</span>
            <span className="flex-1 text-[14px] leading-snug"><b>這次有讀英文單元</b><small className="block text-[12px] text-ink-soft">有讀才勾，會有森林訪客來教一個英文單字 🐰</small></span>
          </button>
          <label className="field">備註（選填）
            <input id="mag-note" className="input" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="例如：最喜歡恐龍那一頁" />
          </label>
          {whenRow}
          <button className="btn btn-block" disabled={busy === 'rec'} onClick={record}>{busy === 'rec' ? '記錄中…' : '記好了 🌼'}</button>
        </>
      )}
      {camera}
    </div>
  )
}
