import { useEffect } from 'react'
import { speak, visitorSvg } from '../lib/visitors'

// 點森林訪客：顯示動物、英文單字，並唸出來
export default function VisitorCard({ visitor, onClose, autoSpeak = true }) {
  useEffect(() => {
    if (visitor && autoSpeak) speak(`${visitor.word.en}`)
  }, [visitor, autoSpeak])
  if (!visitor) return null
  const { info, word, leaf } = visitor
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#3E3832]/50 p-6" onClick={onClose} role="dialog" aria-label={`${info.zh}帶來的英文單字`}>
      <div className="w-full max-w-[320px] rounded-[28px] bg-paper px-6 pb-6 pt-4 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
        <svg viewBox="-34 -66 68 68" className="mx-auto h-32 w-32" dangerouslySetInnerHTML={{ __html: visitorSvg(info.id) }} />
        <p className="text-[13px] text-ink-soft">{info.zh} <span className="font-medium">{info.en}</span> 帶來一個字</p>
        <button className="mt-3 w-full rounded-3xl bg-paper-card px-4 py-4 active:scale-[.98]" onClick={() => speak(word.en)} aria-label={`再聽一次 ${word.en}`}>
          <div className="text-5xl leading-none">{word.emoji}</div>
          <div className="mt-2 font-hand text-[34px] font-bold leading-tight tracking-wide">{word.en}</div>
          <div className="text-base text-ink-soft">{word.zh}</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-sage-mist px-3 py-1 text-[13px] text-sage-deep">🔊 再聽一次</div>
        </button>
        {visitor.special
          ? <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">今天是聖誕節的日子，<br /><b className="text-ink">聖誕老公公來找你玩！</b></p>
          : <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">{info.id === 'elf' || info.id === 'santa' ? '他' : '牠'}是跟著英文書<br /><b className="text-ink">《{leaf.book.title}》</b>來的</p>}
        <button className="btn-ghost mt-4 w-full" onClick={onClose}>好喔！</button>
      </div>
    </div>
  )
}
