import { useState } from 'react'
import { GAMES } from '../lib/games'
import MemoryGame from './MemoryGame'
import MathGame from './MathGame'
import PinballGame from './PinballGame'

/*
  小遊戲選單：所有遊戲都列出來
  - 已解鎖：可以玩（今天的輪數所有遊戲共用）
  - 還沒解鎖：顯示鎖頭和「再讀幾次」
  - 製作中：敬請期待
*/
export default function GameMenu({ child, leaves, total, earned, played, onUseRound, onClose }) {
  const [open, setOpen] = useState(null)
  const left = Math.max(0, earned - played)

  if (open === 'memory') return <MemoryGame child={child} leaves={leaves} left={left} onUseRound={onUseRound} onClose={() => setOpen(null)} />
  if (open === 'pinball') return <PinballGame leaves={leaves} left={left} onUseRound={onUseRound} onClose={() => setOpen(null)} />
  if (open === 'math') return <MathGame child={child} leaves={leaves} left={left} onUseRound={onUseRound} onClose={() => setOpen(null)} />

  return (
    <div className="fixed inset-0 z-[65] flex flex-col overflow-y-auto bg-[#F3ECDA]" role="dialog" aria-label="小遊戲"
      style={{ padding: 'calc(12px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}>
      <div className="mx-auto w-full max-w-[480px]">
        <div className="flex items-center justify-between">
          <h2 className="h-hand text-2xl">🎮 小遊戲</h2>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-paper text-2xl shadow" onClick={onClose} aria-label="回到小樹">🌳</button>
        </div>
        <div className="mt-3 rounded-2xl bg-paper-card px-4 py-3 text-center shadow-sm">
          {leaves.length === 0 ? <p className="h-hand text-lg">讀一本書、澆完水，就可以玩囉！</p>
            : left > 0 ? <p className="h-hand text-lg">今天還可以玩 <b className="text-2xl text-sage-deep">{left}</b> 輪</p>
              : <p className="h-hand text-lg">{earned === 0 ? '今天讀一本書、澆完水就能玩囉！' : '今天的遊戲玩完了，再讀一本書就能再玩 3 輪 🌙'}</p>}
          <p className="mt-0.5 text-xs text-ink-soft">已經讀了 {total} 次故事 · 每讀一本書可以玩 3 輪</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {GAMES.map((g) => {
            const locked = !g.soon && total < g.unlock
            const playable = !g.soon && !locked && leaves.length > 0
            const need = g.unlock - total
            return (
              <button key={g.id} disabled={!playable} onClick={() => setOpen(g.id)}
                className={`relative flex flex-col items-center rounded-3xl px-2 pb-3 pt-4 text-center transition ${playable ? 'bg-paper-card shadow-[0_5px_0_#E2D3B0] active:translate-y-1 active:shadow-none' : 'bg-[#EDE5D2]'}`}>
                <span className={`text-5xl ${playable ? '' : 'opacity-40 grayscale'}`}>{g.icon}</span>
                <b className={`h-hand mt-1 text-lg ${playable ? '' : 'text-ink-soft'}`}>{g.name}</b>
                <span className="text-[12px] text-ink-soft">{g.desc}</span>
                {locked && (
                  <>
                    <span className="absolute right-2 top-2 text-2xl">🔒</span>
                    <span className="mt-2 w-full px-2">
                      <span className="block h-2 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (total / g.unlock) * 100)}%` }} /></span>
                      <span className="mt-1 block text-[12px] font-bold text-bark">再讀 {need} 次解鎖</span>
                    </span>
                  </>
                )}
                {g.soon && <span className="mt-2 rounded-full bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft">🛠️ 製作中</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
