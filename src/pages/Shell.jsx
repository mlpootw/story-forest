import { useEffect, useState } from 'react'
import { ageText } from '../lib/ages'
import { toast } from '../lib/toast'
import { Avatar, Seedling, Sheet } from '../components/ui'
import FamilySettings from './FamilySettings'

const TABS = [
  ['garden', '我的花園', <path key="g" d="M12 21v-7M12 14c-3 0-5.5-2-5.5-5S9 3 12 3s5.5 3 5.5 6-2.5 5-5.5 5zM5 21h14" />],
  ['calendar', '閱讀月曆', <path key="c" d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12.5A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4" />],
  ['library', '繪本書房', <path key="l" d="M12 6.5C10 5 7 4.5 3.5 5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v14" />],
  ['report', '閱讀報告', <path key="r" d="M6 3.5h9l4 4v13H6zM14.5 3.5v4.5H19M9.5 17v-3M12.5 17v-5.5M15.5 17v-2" />]
]
const SOON = {
  garden: '第四階段：閱讀樹會依真實紀錄長葉子',
  calendar: '第四階段：每天的共讀紀錄會出現在月曆上',
  library: '第三階段：可以掃描 ISBN、搜尋書名、手動新增繪本',
  report: '第五階段：每月報告與年度森林'
}

export default function Shell({ session, data, reload }) {
  const { children, family } = data
  const [tab, setTab] = useState('garden')
  const [showSettings, setShowSettings] = useState(false)
  const [pickChild, setPickChild] = useState(false)
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem('sf-active-child') } catch { return null }
  })
  const child = children.find((c) => c.id === activeId) || children[0]
  useEffect(() => { try { localStorage.setItem('sf-active-child', child.id) } catch { /* 無痕模式 */ } }, [child.id])

  if (showSettings) return <FamilySettings session={session} data={data} reload={reload} onBack={() => setShowSettings(false)} />

  const now = new Date()
  return (
    <div className="page pb-32">
      <header className="sticky z-20 -mx-4 flex items-center gap-2 bg-paper px-4 pb-2 pt-3" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="min-w-0 flex-1">
          <b className="h-hand block truncate text-[18.5px]">小小書房｜故事森林</b>
          <small className="block truncate text-[11.5px] tracking-wider text-ink-soft">{family.name}</small>
        </div>
        <button className="flex items-center gap-1.5 rounded-full border border-line bg-paper-card py-1 pl-1 pr-3" onClick={() => setPickChild(true)} aria-label="切換孩子">
          <Avatar child={child} /><span className="text-sm">{child.nickname}</span>
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full" onClick={() => setShowSettings(true)} aria-label="家庭設定">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
        </button>
      </header>

      <main className="pt-2">
        <h2 className="h-hand text-center text-[22px]">{now.getFullYear()} 年 {now.getMonth() + 1} 月</h2>
        <p className="text-center text-[13px] text-ink-soft">{child.nickname}{ageText(child) && ` · ${ageText(child)}`}</p>
        <Seedling className="mx-auto my-6 w-56" />
        <p className="h-hand text-center text-base text-sage-deep">等待第一片葉子</p>
        <div className="notice mt-6">
          <p className="font-medium">第二階段完成：登入與家庭資料已經可以使用 🌱</p>
          <p className="mt-1">現在可以到右上角「設定」新增孩子、邀請另一位家長加入、匯出或刪除資料。</p>
          <p className="mt-2 text-ink-soft">{SOON[tab]}</p>
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="主要導覽">
        <div className="mx-auto grid h-16 max-w-[480px] grid-cols-[1fr_1fr_76px_1fr_1fr] items-end">
          {TABS.slice(0, 2).map(([k, t, d]) => <TabBtn key={k} on={tab === k} label={t} d={d} onClick={() => setTab(k)} />)}
          <button className="relative h-full" aria-label="新增繪本" onClick={() => toast('新增繪本會在第三階段開放')}>
            <span className="absolute bottom-3.5 left-1/2 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full bg-sage text-white shadow-[0_4px_14px_rgba(95,132,104,.45),0_0_0_5px_#F8F4EB]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
          </button>
          {TABS.slice(2).map(([k, t, d]) => <TabBtn key={k} on={tab === k} label={t} d={d} onClick={() => setTab(k)} />)}
        </div>
      </nav>

      <Sheet open={pickChild} onClose={() => setPickChild(false)} title="切換孩子">
        {children.map((c) => (
          <button key={c.id} className="flex w-full items-center gap-3 border-b border-line py-3 text-left" onClick={() => { setActiveId(c.id); setPickChild(false) }}>
            <Avatar child={c} size={40} />
            <span className="flex-1"><b className="block">{c.nickname}</b><span className="text-[13px] text-ink-soft">{ageText(c) || '年紀未填'}</span></span>
            {c.id === child.id && <span className="text-sage-deep">✓</span>}
          </button>
        ))}
        <button className="btn-ghost mt-4 w-full" onClick={() => { setPickChild(false); setShowSettings(true) }}>＋ 新增或編輯孩子</button>
      </Sheet>
    </div>
  )
}

function TabBtn({ on, label, d, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 pb-2 pt-2 text-[11.5px] ${on ? 'font-bold text-sage-deep' : 'text-ink-soft'}`} aria-current={on ? 'page' : undefined}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
      {label}
    </button>
  )
}
