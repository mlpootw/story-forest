// 動物圖鑑（孩子模式裡打開）：遇過的動物亮起來，沒遇過的是剪影
import { useEffect, useMemo, useState } from 'react'
import { ANIMALS, GROUPS, computeMet, fetchAllSessions } from '../lib/animals'
import { speak } from '../lib/visitors'
import { art } from '../lib/art'
import { zhError } from '../lib/errors'

const SHOW_KEY = 'sf-animal-names'
const readShow = () => { try { return localStorage.getItem(SHOW_KEY) === '1' } catch { return false } }
const writeShow = (v) => { try { localStorage.setItem(SHOW_KEY, v ? '1' : '0') } catch { /* 無痕模式 */ } }
const daysAgo = (d) => (Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000

export default function AnimalBook({ child, onClose }) {
  const [met, setMet] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [showNames, setShowNames] = useState(readShow)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let dead = false
    setMet(null); setError('')
    fetchAllSessions(child.id).then((rows) => { if (!dead) setMet(computeMet(rows, child.id)) }).catch((e) => { if (!dead) setError(zhError(e)) })
    return () => { dead = true }
  }, [child.id, tick])

  const total = ANIMALS.length
  const count = met ? ANIMALS.filter((a) => met.has(a.id)).length : 0
  const done = met && count === total
  const byGroup = useMemo(() => GROUPS.map(([g, title]) => [title, ANIMALS.filter((a) => a.group === g)]), [])
  const cur = open ? ANIMALS.find((a) => a.id === open) : null
  const curMet = cur && met?.has(cur.id)

  useEffect(() => { if (curMet) speak(cur.say || cur.en) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-paper px-4 pb-10 pt-3">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <button className="h-11 rounded-full border border-line bg-paper-card px-4 font-hand text-lg font-bold" onClick={onClose} aria-label="回到花園">‹ 回去</button>
          <h2 className="h-hand text-[22px]">森林朋友圖鑑</h2>
          <span className="w-[72px]" />
        </div>

        {error && <div className="error-box mt-4">{error} <button className="underline" onClick={() => setTick((t) => t + 1)}>重試</button></div>}
        {!met && !error && <p className="py-24 text-center text-sm text-ink-soft">正在翻圖鑑…</p>}

        {met && (
          <>
            <div className={`mt-4 rounded-3xl px-4 py-3 text-center ${done ? 'bg-[#FBEFC8]' : 'bg-sage-mist'}`}>
              <p className="font-hand text-xl font-bold">{done ? '全部的森林朋友都找到了！' : <>已經遇見 <span className="text-[26px]">{count}</span> / {total}</>}</p>
              <div className="mx-auto mt-2 h-3 w-full overflow-hidden rounded-full bg-paper-card" role="progressbar" aria-valuenow={count} aria-valuemax={total}>
                <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${(count / total) * 100}%` }} />
              </div>
              {!done && count > 0 && <p className="mt-1.5 text-[13px] text-ink-soft">{count >= 10 ? '哇，好多好朋友！' : '繼續讀書，會遇到更多朋友喔'}</p>}
            </div>

            {byGroup.map(([title, list]) => (
              <section key={title} className="mt-5">
                <h3 className="mb-2 text-[13.5px] font-semibold text-ink-soft">{title} · {list.filter((a) => met.has(a.id)).length}/{list.length}</h3>
                <div className="grid grid-cols-3 gap-3">
                  {list.map((a) => {
                    const got = met.has(a.id)
                    const fresh = got && daysAgo(met.get(a.id)) <= 7
                    return (
                      <button key={a.id} onClick={() => setOpen(a.id)} className="relative flex flex-col items-center rounded-2xl border-2 border-line bg-paper-card px-1 pb-2 pt-2 active:scale-95" aria-label={got ? a.zh : '還沒遇見的朋友'}>
                        {fresh && <span className="absolute -right-1 -top-2 rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-bold text-[#4A3F2E]">新！</span>}
                        <div className="relative grid h-20 w-full place-items-center">
                          <img src={art(a.img)} alt="" draggable="false" className="pointer-events-none h-20 w-full select-none object-contain"
                            style={got ? undefined : { filter: 'brightness(0)', opacity: 0.16 }} />
                          {!got && <span className="absolute font-hand text-3xl font-bold text-ink-soft">？</span>}
                        </div>
                        <span className="mt-1 font-hand text-[14px] font-bold">{got ? a.zh : showNames ? a.zh : '？？？'}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}

            <label className="mt-6 flex items-center justify-center gap-2 text-[12px] text-ink-soft">
              <input type="checkbox" checked={showNames} onChange={(e) => { setShowNames(e.target.checked); writeShow(e.target.checked) }} />
              家長看名單（剪影下面顯示名字）
            </label>
          </>
        )}
      </div>

      {cur && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#3E3832]/55 p-6" onClick={() => setOpen(null)}>
          <div className="sf-frame w-full max-w-xs rounded-[28px] bg-paper-card p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <img src={art(cur.img)} alt="" draggable="false" className="pointer-events-none mx-auto h-36 w-36 select-none object-contain"
              style={curMet ? undefined : { filter: 'brightness(0)', opacity: 0.18 }} />
            {curMet ? (
              <>
                <button className="mt-2 inline-flex items-center gap-2 font-hand text-[34px] font-bold leading-tight" onClick={() => speak(cur.say || cur.en)} aria-label={`唸 ${cur.en}`}>
                  {cur.en} <span className="text-2xl">🔊</span>
                </button>
                <p className="font-hand text-xl">{cur.zh}</p>
                <p className="mt-3 text-[15px] leading-relaxed">{cur.fact}</p>
                <p className="mt-3 text-[11.5px] text-ink-soft">第一次見面：{met.get(cur.id).replaceAll('-', '/')}</p>
              </>
            ) : (
              <>
                <p className="mt-2 font-hand text-2xl font-bold">還沒遇見喔！</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{cur.hint}</p>
                {showNames && <p className="mt-2 text-[11.5px] text-ink-soft">（家長看：{cur.zh}／{cur.en}）</p>}
              </>
            )}
            <button className="btn-ghost mt-4 w-full" onClick={() => setOpen(null)}>好喔！</button>
          </div>
        </div>
      )}
    </div>
  )
}
