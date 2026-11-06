import { useEffect, useState } from 'react'
import { ageText } from '../lib/ages'
import { Avatar, Seedling, Sheet } from '../components/ui'
import AddBookSheet from '../components/AddBookSheet'
import FamilySettings from './FamilySettings'
import Library from './Library'
import Calendar from './Calendar'
import Garden from './Garden'
import { CrayonDefs, NavIcons } from '../components/Doodles'
import { art } from '../lib/art'

const TABS = [
  ['garden', '我的花園', <path key="g" d="M12 21v-7M12 14c-3 0-5.5-2-5.5-5S9 3 12 3s5.5 3 5.5 6-2.5 5-5.5 5zM5 21h14" />],
  ['calendar', '閱讀月曆', <path key="c" d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v12.5A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5zM3.5 10h17M8 3v4M16 3v4" />],
  ['library', '繪本書房', <path key="l" d="M12 6.5C10 5 7 4.5 3.5 5v14c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v14" />],
  ['report', '閱讀報告', <path key="r" d="M6 3.5h9l4 4v13H6zM14.5 3.5v4.5H19M9.5 17v-3M12.5 17v-5.5M15.5 17v-2" />]
]

export default function Shell({ session, data, reload }) {
  const { children, family } = data
  const [tab, setTab] = useState('garden')
  const [showSettings, setShowSettings] = useState(false)
  const [pickChild, setPickChild] = useState(false)
  const [add, setAdd] = useState(null) // null | { date }
  const [refresh, setRefresh] = useState(0)
  const bump = () => setRefresh((n) => n + 1)
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem('sf-active-child') } catch { return null }
  })
  const child = children.find((c) => c.id === activeId) || children[0]
  useEffect(() => { try { localStorage.setItem('sf-active-child', child.id) } catch { /* 無痕模式 */ } }, [child.id])

  if (showSettings) return <FamilySettings session={session} data={data} reload={reload} onBack={() => setShowSettings(false)} />

  return (
    <div className="page pb-32">
      <CrayonDefs />
      <header className="sticky z-20 -mx-4 flex items-center gap-2 bg-paper px-4 pb-2 pt-3" style={{ top: 'env(safe-area-inset-top)' }}>
        <div className="min-w-0 flex-1">
          <b className="h-hand flex items-center gap-1.5 truncate text-[19px]">
            小小書房｜故事森林<img src={art('whiteeye-fly')} alt="" className="-mt-1 h-8 w-auto shrink-0" /></b>
          <small className="block truncate text-[12.5px] tracking-wider text-ink-soft">{family.name}</small>
        </div>
        <button className="flex items-center gap-1.5 rounded-full border border-line bg-paper-card py-1 pl-1 pr-3" onClick={() => setPickChild(true)} aria-label="切換孩子">
          <Avatar child={child} /><span className="text-sm">{child.nickname}</span>
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full" onClick={() => setShowSettings(true)} aria-label="家庭設定">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" /></svg>
        </button>
      </header>

      <main className="pt-2">
        {tab === 'garden' && <Garden key={child.id} child={child} family={family} refresh={refresh} onChanged={bump} onAdd={() => setAdd({})} />}
        {tab === 'calendar' && <Calendar child={child} refresh={refresh} onChanged={bump} onAddOn={(date) => setAdd({ date })} />}
        {tab === 'library' && <Library child={child} family={family} refresh={refresh} onChanged={bump} onAdd={() => setAdd({})} />}
        {tab === 'report' && (
          <div className="py-16 text-center text-sm leading-relaxed text-ink-soft"><Seedling className="mx-auto mb-3 w-24" />每月閱讀報告與年度森林<br />會在第五階段完成。</div>
        )}
      </main>
      <AddBookSheet open={!!add} onClose={() => setAdd(null)} session={session} data={data} childId={child.id} presetDate={add?.date}
        onSaved={({ childId }) => { setActiveId(childId); bump() }} />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="主要導覽">
        <div className="mx-auto grid h-16 max-w-[480px] grid-cols-[1fr_1fr_76px_1fr_1fr] items-end">
          {TABS.slice(0, 2).map(([k, t]) => <TabBtn key={k} on={tab === k} label={t} icon={NavIcons[k]} onClick={() => setTab(k)} />)}
          <button className="relative h-full" aria-label="新增繪本" onClick={() => setAdd({})}>
            <span className="absolute bottom-3.5 left-1/2 grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-full sf-fab bg-sage-deep text-white">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
          </button>
          {TABS.slice(2).map(([k, t]) => <TabBtn key={k} on={tab === k} label={t} icon={NavIcons[k]} onClick={() => setTab(k)} />)}
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

function TabBtn({ on, label, icon, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 pb-1.5 pt-1.5 text-[12.5px] ${on ? 'sf-tab-on font-bold text-sage-deep' : 'text-ink-soft'}`} aria-current={on ? 'page' : undefined}>
      <span className="sf-tab-blob grid h-9 w-12 place-items-center"><svg viewBox="0 0 64 64" className={`h-8 w-8 transition ${on ? 'scale-110' : 'opacity-60 saturate-50'}`} aria-hidden="true"><g filter="url(#sf-crayon)">{icon}</g></svg></span>
      {label}
    </button>
  )
}
