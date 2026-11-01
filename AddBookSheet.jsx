import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { CATEGORIES, catOf, suggestCategory, normalizeIsbn, lookupIsbn, searchTitle, ymd, compressImage } from '../lib/books'
import { ensureBook, ensureChildBook, addSession, uploadCover } from '../lib/records'
import { Sheet } from './ui'
import Cover from './Cover'

// 掃描套件較大，打開掃描時才下載
const Scanner = lazy(() => import('./Scanner'))

const TABS = [['scan', '掃描 ISBN'], ['search', '搜尋書名'], ['manual', '手動新增']]

export default function AddBookSheet({ open, onClose, session, data, childId: initialChild, presetDate, onSaved }) {
  const { family, children } = data
  const [tab, setTab] = useState('scan')
  const [state, setState] = useState({ busy: false, msg: '', error: '' })
  const [isbnInput, setIsbnInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [cand, setCand] = useState(null) // { book, from }
  const [owned, setOwned] = useState(null) // { bookId, childBookId, category_id } 已在書房
  const [cat, setCat] = useState(undefined)
  const [date, setDate] = useState(presetDate || ymd())
  const [childId, setChildId] = useState(initialChild)
  const [note, setNote] = useState('')
  const [manual, setManual] = useState({ title: '', author: '', isbn: '' })
  const [coverFile, setCoverFile] = useState(null)
  const [coverInfo, setCoverInfo] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTab('scan'); setState({ busy: false, msg: '', error: '' }); setIsbnInput(''); setQuery(''); setResults(null)
    setCand(null); setOwned(null); setCat(undefined); setDate(presetDate || ymd()); setChildId(initialChild); setNote('')
    setManual({ title: '', author: '', isbn: '' }); setCoverFile(null); setCoverInfo(null)
  }, [open, presetDate, initialChild])

  // 這本書是否已在這個孩子的書房
  useEffect(() => {
    let alive = true
    async function check() {
      setOwned(null)
      if (!cand) return
      let bookId = cand.book.id
      if (!bookId && cand.book.isbn13) {
        const { data: rows } = await supabase.from('books').select('id, owner_family_id').eq('isbn13', cand.book.isbn13)
        bookId = rows?.find((r) => !r.owner_family_id)?.id || rows?.find((r) => r.owner_family_id === family.id)?.id
      }
      if (!bookId) return
      const { data: cb } = await supabase.from('child_books').select('id, category_id').eq('child_id', childId).eq('book_id', bookId).maybeSingle()
      if (alive && cb) { setOwned({ bookId, childBookId: cb.id, category_id: cb.category_id }); setCat(cb.category_id) }
    }
    check()
    return () => { alive = false }
  }, [cand, childId, family.id])

  const fail = (error) => setState({ busy: false, msg: '', error })
  const offline = () => !navigator.onLine && (fail('目前離線，無法查詢書籍資料。連上網路後再試，或先手動新增。'), true)

  const runLookup = useCallback(async (raw) => {
    const n = normalizeIsbn(raw)
    if (!n) return fail('這不是有效的 ISBN，請確認 10 碼或 13 碼數字有沒有打錯。')
    if (offline()) return
    setState({ busy: true, msg: '正在查詢…', error: '' })
    try {
      const r = await lookupIsbn(n.isbn13, (msg) => setState((s) => ({ ...s, msg })))
      if (!r) {
        setManual((m) => ({ ...m, isbn: n.isbn13 }))
        return fail(`Google Books 和 Open Library 都找不到 ISBN ${n.isbn13}。台灣小型出版社或較新的繪本常常沒有收錄，可以改用「手動新增」。`)
      }
      if (!r.book.isbn10 && n.isbn10) r.book.isbn10 = n.isbn10
      setState({ busy: false, msg: '', error: '' })
      setCat(undefined)
      setCand(r)
    } catch (e) {
      fail(e.message === 'rate_limited' ? '書籍資料庫暫時忙碌（查詢次數太多），請過幾分鐘再試，或先手動新增。' : '查詢時連線失敗，請再試一次，或改用手動新增。')
    }
  }, [])

  async function runSearch() {
    if (!query.trim()) return
    if (offline()) return
    setState({ busy: true, msg: '正在搜尋繪本…', error: '' })
    try {
      setResults(await searchTitle(query))
      setState({ busy: false, msg: '', error: '' })
    } catch {
      fail('搜尋時連線失敗，請再試一次。')
    }
  }

  async function pickCover(e) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const r = await compressImage(f)
      setCoverFile(f)
      setCoverInfo({ preview: URL.createObjectURL(r.blob), text: `壓縮後 ${(r.blob.size / 1024).toFixed(0)} KB（原檔 ${(f.size / 1024).toFixed(0)} KB）` })
    } catch {
      toast('這張照片無法處理，請換一張試試')
    }
  }

  function manualNext() {
    if (!manual.title.trim()) return fail('請填寫書名。')
    let isbn13 = null
    if (manual.isbn.trim()) {
      const n = normalizeIsbn(manual.isbn)
      if (!n) return fail('ISBN 格式不正確；沒有 ISBN 的書可以留空。')
      isbn13 = n.isbn13
    }
    setState({ busy: false, msg: '', error: '' })
    setCat(undefined)
    setCand({
      book: { title: manual.title.trim(), authors: manual.author.trim() ? [manual.author.trim()] : [], isbn13, source: 'manual', cover_url: coverInfo?.preview || null, cover_source: coverFile ? 'upload' : 'none', subjects: [] },
      from: '家長手動建立',
      manual: true
    })
  }

  async function save() {
    if (date > ymd()) return toast('不能記錄未來的日期')
    setSaving(true)
    try {
      const book = { ...cand.book }
      const suggestion = suggestCategory(book)
      if (cand.manual) {
        book.cover_url = null
        book.cover_source = 'none'
        if (coverFile) { book.cover_url = await uploadCover(family.id, coverFile); book.cover_source = 'upload' }
      }
      const finalCat = cat === undefined ? (owned ? owned.category_id : suggestion?.id ?? null) : cat
      const bookId = owned?.bookId || (await ensureBook({ book, familyId: family.id, userId: session.user.id, suggested: suggestion?.id }))
      const cb = await ensureChildBook({ childId, bookId, familyId: family.id, categoryId: finalCat })
      const { newLeaf } = await addSession({ childBookId: cb.id, childId, bookId, familyId: family.id, readOn: date, note })
      const name = children.find((c) => c.id === childId)?.nickname
      toast(newLeaf ? `記好了！${name}這個月的樹多一片新葉子 🌱` : '記好了！這個月又讀了一次，葉子會亮起微光 ✨')
      onSaved?.({ childId, date })
      onClose()
    } catch (e) {
      toast(e.message === 'image_too_large' ? '封面照片太大，請換一張' : zhError(e))
    } finally {
      setSaving(false)
    }
  }

  const suggestion = cand ? suggestCategory(cand.book) : null
  const shownCat = cat === undefined ? (owned ? owned.category_id : suggestion?.id ?? null) : cat

  return (
    <Sheet open={open} onClose={onClose} title={cand ? '確認是這本書嗎？' : '新增繪本'}>
      {!cand ? (
        <>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {TABS.map(([k, t]) => (
              <button key={k} onClick={() => { setTab(k); setState({ busy: false, msg: '', error: '' }) }}
                className={`rounded-xl border px-1 py-2.5 text-[13.5px] ${tab === k ? 'border-sage bg-sage-mist font-bold text-sage-deep' : 'border-line'}`}>{t}</button>
            ))}
          </div>

          {tab === 'scan' && (
            <>
              {!state.busy && (
                <Suspense fallback={<div className="grid h-56 place-items-center rounded-2xl bg-[#2F2A25] text-[13px] text-paper">正在準備相機…</div>}>
                  <Scanner onDetected={runLookup} />
                </Suspense>
              )}
              <div className="mt-3 flex gap-2">
                <input id="isbn-input" className="input" inputMode="numeric" placeholder="或輸入書背的 ISBN（10 或 13 碼）" value={isbnInput}
                  onChange={(e) => setIsbnInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runLookup(isbnInput)} />
                <button className="btn shrink-0" onClick={() => runLookup(isbnInput)} disabled={state.busy}>查詢</button>
              </div>
            </>
          )}

          {tab === 'search' && (
            <>
              <div className="flex gap-2">
                <input id="title-search" type="search" className="input" placeholder="輸入書名，例如：好餓的毛毛蟲" value={query}
                  onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
                <button className="btn shrink-0" onClick={runSearch} disabled={state.busy}>搜尋</button>
              </div>
              {results && !state.busy && (results.length ? (
                <ul className="mt-2">
                  {results.map((b, i) => (
                    <li key={b.source_id || i}>
                      <button className="grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border-b border-line py-2.5 text-left"
                        onClick={() => { setCat(undefined); setCand({ book: b, from: b.source === 'google' ? 'Google Books' : 'Open Library' }) }}>
                        <Cover book={b} categoryId={suggestCategory(b)?.id} size="xs" />
                        <span className="min-w-0"><b className="block truncate">{b.title}</b>
                          <span className="block truncate text-[12.5px] text-ink-soft">{[b.authors.join('、'), b.publisher, b.published_date?.slice(0, 4)].filter(Boolean).join(' · ')}</span></span>
                      </button>
                    </li>
                  ))}
                  <li className="hint pt-2">書籍資料來自 Google Books／Open Library</li>
                </ul>
              ) : (
                <div className="py-6 text-center text-sm text-ink-soft">找不到「{query}」。<br />可以換個關鍵字，或改用手動新增。
                  <div className="mt-3"><button className="btn" onClick={() => { setTab('manual'); setManual((m) => ({ ...m, title: query })) }}>手動新增</button></div></div>
              ))}
            </>
          )}

          {tab === 'manual' && (
            <div className="flex flex-col gap-3">
              <label className="field">書名（必填）<input id="m-title" className="input" value={manual.title} onChange={(e) => setManual({ ...manual, title: e.target.value })} /></label>
              <label className="field">作者<input id="m-author" className="input" value={manual.author} onChange={(e) => setManual({ ...manual, author: e.target.value })} /></label>
              <label className="field">ISBN（沒有可以留空）<input id="m-isbn" className="input" inputMode="numeric" value={manual.isbn} onChange={(e) => setManual({ ...manual, isbn: e.target.value })} /></label>
              <label className="field">封面照片（選填）
                <input id="m-cover" type="file" accept="image/*" className="text-[13px]" onChange={pickCover} />
              </label>
              {coverInfo ? (
                <div className="flex items-center gap-3"><img src={coverInfo.preview} alt="封面預覽" className="w-16 rounded" /><span className="hint">{coverInfo.text}</span></div>
              ) : <p className="hint -mt-1">照片會先縮小並壓縮（最寬 600px、300 KB 以內）再上傳。</p>}
              <button className="btn btn-block" onClick={manualNext}>下一步：確認分類</button>
            </div>
          )}

          {state.busy && <div className="py-8 text-center text-sm text-ink-soft"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-paper-3 border-t-sage" />{state.msg}</div>}
          {state.error && (
            <div className="error-box mt-3">{state.error}
              {tab !== 'manual' && <div className="mt-3"><button className="btn px-4 py-1.5 text-sm" onClick={() => { setTab('manual'); setState({ busy: false, msg: '', error: '' }) }}>改用手動新增</button></div>}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-4">
            <Cover book={cand.book} categoryId={shownCat} size="md" />
            <div className="min-w-0">
              <h4 className="text-[17px] font-medium leading-snug">{cand.book.title}</h4>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                {cand.book.authors?.join('、') || '作者不詳'}{cand.book.publisher && ` · ${cand.book.publisher}`}<br />
                ISBN {cand.book.isbn13 || '—'}<br />
                <span className="text-bark">資料來源：{cand.from}</span>
              </p>
            </div>
          </div>
          {cand.book.description && <p className="line-clamp-4 rounded-xl bg-paper-2 px-3 py-2.5 text-[13px] leading-relaxed">{cand.book.description}</p>}

          {owned ? (
            <div className="notice">這本書已經在{children.find((c) => c.id === childId)?.nickname}的書房裡，不會重複建檔，只會新增一次共讀紀錄。</div>
          ) : suggestion ? (
            <div className="notice">建議分類：<b>{catOf(suggestion.id).name}</b><br /><span className="hint">依書名與介紹中的「{suggestion.hits.join('、')}」判斷，不一定正確，請確認。</span></div>
          ) : (
            <div className="rounded-2xl bg-paper-2 px-4 py-3 text-[13.5px] leading-relaxed">資料太少，還判斷不出分類，先標為<b>待確認分類</b>。可以直接選一個，之後也能在書房修改。</div>
          )}

          <div className="field">主要分類（決定葉子顏色）
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)}
                  className={`flex items-center gap-2 rounded-xl border-[1.5px] px-2.5 py-2 text-left text-[13px] leading-tight text-ink ${shownCat === c.id ? 'border-ink bg-paper-card font-bold' : 'border-line'}`}>
                  <i className="h-3 w-3 shrink-0 rounded-[12px_2px_12px_2px]" style={{ background: c.color }} />{c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="field">共讀日期<input id="read-date" type="date" className="input" value={date} max={ymd()} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="field">和誰一起讀
              <select id="read-child" className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => <option key={c.id} value={c.id}>{c.nickname}</option>)}
              </select>
            </label>
          </div>
          <label className="field">家長備註（選填）<input id="read-note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：一直指著挖土機笑" /></label>

          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => { setCand(null); setOwned(null) }} disabled={saving}>不是這本</button>
            <button className="btn flex-1" onClick={save} disabled={saving}>{saving ? '儲存中…' : '加入共讀紀錄'}</button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
