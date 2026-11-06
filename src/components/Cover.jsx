import { useState } from 'react'
import { catOf } from '../lib/books'

// 有封面網址就顯示圖片；沒有或載入失敗時，用分類顏色的手繪色塊封面
export default function Cover({ book, categoryId, size = 'md', count }) {
  const [broken, setBroken] = useState(false)
  const c = catOf(categoryId)
  const fs = { xs: 8, sm: 10, md: 12, lg: 15 }[size]
  const seed = [...(book?.title || '?')].reduce((a, ch) => a + ch.charCodeAt(0), 0)
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[4px_8px_8px_4px] shadow-[inset_4px_0_0_rgba(0,0,0,.08),0_2px_6px_rgba(92,81,70,.18)]"
      style={{ background: `linear-gradient(170deg, ${c.color}, ${c.color}dd)` }}>
      {book?.cover_url && !broken ? (
        <img src={book.cover_url} alt={`${book.title}封面`} loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <>
          <span className="absolute aspect-square rounded-full bg-paper opacity-50" style={{ left: `${20 + (seed % 45)}%`, top: `${52 + (seed % 30)}%`, width: `${42 + (seed % 30)}%` }} />
          <span className="absolute left-[10%] right-[10%] top-[12%] break-all font-round leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,.18)]" style={{ fontSize: fs }}>
            {book?.title}
          </span>
        </>
      )}
      {count ? <span className="absolute bottom-1 right-1 rounded-full bg-paper/90 px-1.5 text-[10.5px] tabular-nums text-ink">{count}</span> : null}
    </div>
  )
}
