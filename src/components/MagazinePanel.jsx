import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { CATEGORIES, catOf, ymd } from '../lib/books'
import { ensureChildBook, addSession, uploadCover } from '../lib/records'
import Cover from './Cover'
import CoverCamera from './CoverCamera'

/*
  雜誌：第一次建立雜誌（名稱＋固定分類＋封面），之後每次只要按一下「今天讀了」
  整本雜誌在樹下是一朵花，讀越多次開得越大
*/
export default function MagazinePanel({ session, family, children, childId, setChildId, date, setDate, presetIssn, onSaved, onClose }) {
  const [mags, setMags] = useState(null)
  const [creating, setCreating] = useState(!!presetIssn)
  const [form, setForm] = useState({ title: '', cat: 'cognition', issn: presetIssn || '' })
  const [cover, setCover] = useState(null) // { file, preview }
  const [cam, setCam] = useState(false)
  const [issue, setIssue] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const { data, error } = await supabase.from('books').select('id, title, cover_url, issn, child_books(id, child_id, category_id, cover_url)')
      .eq('owner_family_id', family.id).eq('kind', 'magazine').order('created_at')
    if (error) { setMags([]); if (/kind|schema cache/i.test(error.message)) toast('請先到 Supabase 執行雜誌的更新 SQL'); return }
    setMags(data)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (presetIssn) { setCreating(true); setForm((f) => ({ ...f, issn: presetIssn })) } }, [presetIssn])

  async function readToday(mag) {
    if (date > ymd()) return toast('不能記錄未來的日期')
    setBusy(mag.id)
    try {
      const fixedCat = mag.child_books?.find((c) => c.category_id)?.category_id ?? 'cognition'
      const cb = await ensureChildBook({ childId, bookId: mag.id, familyId: family.id, categoryId: fixedCat })
      const { newLeaf } = await addSession({ childBookId: cb.id, childId, bookId: mag.id, familyId: family.id, readOn: date, note: issue.trim() ? `讀了${issue.trim()}` : '' })
      const name = children.find((c) => c.id === childId)?.nickname
      toast(newLeaf ? `記好了！樹下冒出一個雜誌花苞，等${name}來澆水 🌼` : `記好了！雜誌花會再長大一點 🌼`)
      onSaved?.({ childId, date })
      onClose()
    } catch (e) { toast(zhError(e)) } finally { setBusy('') }
  }

  async function create() {
    if (!form.title.trim()) return toast('請填寫雜誌名稱')
    setBusy('new')
    try {
      const cover_url = cover ? await uploadCover(family.id, cover.file) : null
      const { data, error } = await supabase.from('books').insert({
        title: form.title.trim(), kind: 'magazine', source: 'manual', owner_family_id: family.id, created_by: session.user.id,
        issn: form.issn || null, cover_url, cover_source: cover_url ? 'upload' : 'none', subjects: [], authors: []
      }).select('id, title, cover_url, issn').single()
      if (error) throw error
      // 每個孩子都先建立書房紀錄，固定分類
      for (const c of children) await ensureChildBook({ childId: c.id, bookId: data.id, familyId: family.id, categoryId: form.cat })
      await readToday({ ...data, child_books: [{ category_id: form.cat }] })
    } catch (e) {
      toast(/kind|schema cache/i.test(e.message || '') ? '請先到 Supabase 執行雜誌的更新 SQL' : zhError(e))
      setBusy('')
    }
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

  if (!mags) return <p className="py-8 text-center text-sm text-ink-soft">載入中…</p>

  if (creating) {
    return (
      <div className="flex flex-col gap-3">
        {presetIssn && <div className="notice">掃到一本新的雜誌！取個名字，之後再掃這本雜誌就會自動認出來。</div>}
        <label className="field">雜誌名稱<input id="mag-title" className="input" autoFocus value={form.title} placeholder="例如：小康軒學前版" onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
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
        <div className="field">封面照片（選填）
          <div className="flex items-center gap-3">
            {cover && <img src={cover.preview} alt="封面預覽" className="w-14 rounded shadow" />}
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setCam(true)}>📷 {cover ? '重拍' : '拍封面'}</button>
          </div>
        </div>
        {whenRow}
        <div className="flex gap-2">
          {mags.length > 0 && <button className="btn-ghost" onClick={() => setCreating(false)}>返回</button>}
          <button className="btn flex-1" disabled={busy === 'new'} onClick={create}>{busy === 'new' ? '建立中…' : '建立雜誌並記錄今天'}</button>
        </div>
        {cam && <CoverCamera onDone={(file, preview) => { setCam(false); setCover({ file, preview }) }} onClose={() => setCam(false)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {mags.length ? (
        <>
          <p className="text-[13px] text-ink-soft">點一下就記錄今天讀了這本雜誌</p>
          {mags.map((m) => {
            const mine = m.child_books?.find((c) => c.child_id === childId)
            const cat = mine?.category_id ?? m.child_books?.[0]?.category_id
            const book = { ...m, cover_url: mine?.cover_url || m.cover_url }
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line bg-paper-card p-2.5">
                <div className="w-12 shrink-0"><Cover book={book} categoryId={cat} size="xs" /></div>
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{m.title}</b>
                  <span className="flex items-center gap-1 text-xs text-ink-soft"><i className="h-2.5 w-2.5 rounded-full" style={{ background: catOf(cat).color }} />{catOf(cat).name}</span>
                </div>
                <button className="btn shrink-0 px-4 py-2 text-sm" disabled={!!busy} onClick={() => readToday(m)}>{busy === m.id ? '…' : '今天讀了'}</button>
              </div>
            )
          })}
          <label className="field">這次讀哪一期？（選填，會記在備註）
            <input id="mag-issue" className="input" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="例如：11 月號、恐龍特輯" />
          </label>
          {whenRow}
          <button className="text-[13px] text-bark underline" onClick={() => setCreating(true)}>＋ 新增另一本雜誌</button>
        </>
      ) : (
        <div className="py-4 text-center">
          <div className="text-5xl">🌼</div>
          <p className="h-hand mt-2 text-lg">雜誌會變成樹下的一朵花</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">不管讀哪一期都算同一朵，讀越多次開得越大。<br />先建立一次，之後每次按一下就記好了。</p>
          <button className="btn mt-4" onClick={() => setCreating(true)}>＋ 建立第一本雜誌</button>
        </div>
      )}
    </div>
  )
}
