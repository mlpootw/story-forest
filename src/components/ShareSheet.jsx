import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from './ui'
import Cover from './Cover'
import { toast, copyText } from '../lib/toast'
import { ageText } from '../lib/ages'
import { renderShareImages, shareText } from '../lib/shareCard'

// 分享最愛書單到 LINE：可勾選要分享哪些書、要放哪些內容
// items: Library 的書（含 books、parent_note、count、category_id）
export default function ShareSheet({ open, onClose, child, items, initialIds }) {
  const [sel, setSel] = useState([])
  const [opt, setOpt] = useState({ note: true, age: true, count: true, nickname: false })
  const [imgs, setImgs] = useState([]) // [{ blob, url }]
  const [busy, setBusy] = useState(false)
  const [fallback, setFallback] = useState(false)
  const timer = useRef()

  useEffect(() => {
    if (open) { setSel(initialIds || items.map((x) => x.id)); setFallback(false) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = useMemo(() => items.filter((x) => sel.includes(x.id)).map((x) => ({
    id: x.id,
    title: x.books.title,
    authors: (x.books.authors || []).join('、'),
    publisher: x.books.publisher,
    cover: x.books.cover_url,
    note: x.parent_note || x.sessions?.find((s) => s.note)?.note || '',
    count: x.count,
    category: x.category_id
  })), [items, sel])

  const now = new Date()
  const opts = { ...opt, childName: child.nickname, ageText: ageText(child), dateText: `${now.getFullYear()} 年 ${now.getMonth() + 1} 月` }

  // 預覽圖：勾選或選項改變後重新產生
  useEffect(() => {
    if (!open) return
    clearTimeout(timer.current)
    if (!chosen.length) { setImgs([]); return }
    timer.current = setTimeout(async () => {
      setBusy(true)
      try {
        const blobs = await renderShareImages(chosen, opts)
        setImgs((old) => { old.forEach((i) => URL.revokeObjectURL(i.url)); return blobs.map((b) => ({ blob: b, url: URL.createObjectURL(b) })) })
      } catch {
        setImgs([])
      } finally { setBusy(false) }
    }, 350)
    return () => clearTimeout(timer.current)
  }, [open, chosen, opt.note, opt.age, opt.count, opt.nickname]) // eslint-disable-line react-hooks/exhaustive-deps

  const text = shareText(chosen, opts)

  async function share() {
    if (!imgs.length) return
    const files = imgs.map((i, n) => new File([i.blob], `故事森林書單${imgs.length > 1 ? `-${n + 1}` : ''}.jpg`, { type: 'image/jpeg' }))
    try {
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, text })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    setFallback(true)
  }

  const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(text)}`
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Sheet open={open} onClose={onClose} title="分享最愛書單">
      {items.length > 1 && (
        <>
          <p className="mb-2 text-[13px] text-ink-soft">選擇要分享的書（已選 {sel.length} 本）</p>
          <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
            {items.map((x) => (
              <button key={x.id} onClick={() => toggle(x.id)} className={`relative w-[70px] shrink-0 text-left transition ${sel.includes(x.id) ? '' : 'opacity-40'}`} aria-pressed={sel.includes(x.id)}>
                <Cover book={x.books} categoryId={x.category_id} size="xs" />
                <span className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${sel.includes(x.id) ? 'bg-sage text-white' : 'bg-paper/90 text-ink-soft'}`}>{sel.includes(x.id) ? '✓' : ''}</span>
                <span className="mt-1 line-clamp-2 block text-[11.5px] leading-snug">{x.books.title}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {[['note', '媽媽的備註'], ['age', '年齡階段'], ['count', '讀了幾次'], ['nickname', `顯示「${child.nickname}」`]].map(([k, t]) => (
          <button key={k} onClick={() => setOpt((o) => ({ ...o, [k]: !o[k] }))} aria-pressed={opt[k]}
            className={`rounded-full border px-3 py-1.5 text-[13px] ${opt[k] ? 'border-sage bg-sage-mist text-sage-deep' : 'border-line text-ink-soft'}`}>
            {opt[k] ? '✓ ' : ''}{t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-paper-2 p-2">
        {!chosen.length ? <p className="py-10 text-center text-sm text-ink-soft">至少選一本書</p>
          : busy && !imgs.length ? <p className="py-16 text-center text-sm text-ink-soft">正在排版書單圖卡…</p>
            : (
              <div className={`flex gap-2 overflow-x-auto ${busy ? 'opacity-60' : ''}`}>
                {imgs.map((i, n) => <img key={i.url} src={i.url} alt={`書單圖卡 ${n + 1}`} className={`${imgs.length > 1 ? 'w-[80%]' : 'w-full'} shrink-0 rounded-xl shadow`} />)}
              </div>
            )}
      </div>
      {imgs.length > 1 && <p className="hint mt-1 text-center">書比較多，自動分成 {imgs.length} 張圖</p>}

      {!fallback ? (
        <button className="btn btn-block mt-4 bg-[#06C755]" disabled={!imgs.length || busy} onClick={share}>分享到 LINE…</button>
      ) : (
        <div className="notice mt-4">
          <p>這支手機的瀏覽器不能直接分享圖片。可以這樣做：</p>
          <ol className="mt-1 list-decimal pl-5 text-[13px] leading-relaxed">
            <li><b>長按上面的圖片</b> → 儲存圖片，再到 LINE 傳送</li>
            <li>或改用文字版分享：</li>
          </ol>
          <div className="mt-2 flex gap-2">
            <a className="btn flex-1 bg-[#06C755] text-sm" href={lineUrl} target="_blank" rel="noreferrer">用 LINE 傳文字書單</a>
            <button className="btn-ghost flex-1 text-sm" onClick={async () => toast((await copyText(text)) ? '書單文字已複製' : '請長按文字手動複製')}>複製文字</button>
          </div>
        </div>
      )}
      <p className="hint mt-3 text-center">分享時會出現手機的分享選單，選 LINE 再選好友或群組。</p>
    </Sheet>
  )
}
