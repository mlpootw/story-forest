import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { AGE_BANDS, AVATAR_COLORS, ageText, thisMonth } from '../lib/ages'
import { Avatar } from './ui'

// 新增或編輯孩子：暱稱＋（出生年月 或 年齡階段）＋代表色
export default function ChildForm({ familyId, child, onSaved, submitLabel = '儲存' }) {
  const [nickname, setNickname] = useState(child?.nickname || '')
  const [mode, setMode] = useState(child?.age_band && !child?.birth_ym ? 'band' : 'birth')
  const [birth, setBirth] = useState(child?.birth_ym ? child.birth_ym.slice(0, 7) : '')
  const [band, setBand] = useState(child?.age_band || '')
  const [color, setColor] = useState(child?.avatar_color || AVATAR_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const preview = { nickname: nickname || '?', avatar_color: color, birth_ym: mode === 'birth' && birth ? birth + '-01' : null, age_band: mode === 'band' ? band : null }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const name = nickname.trim()
    if (!name) return setError('請填寫孩子的暱稱。')
    if (mode === 'birth' && birth && birth > thisMonth()) return setError('出生年月不能是未來。')
    setBusy(true)
    const row = {
      nickname: name,
      birth_ym: mode === 'birth' && birth ? birth + '-01' : null,
      age_band: mode === 'band' && band ? band : null,
      avatar_color: color
    }
    const q = child
      ? supabase.from('children').update(row).eq('id', child.id).select().single()
      : supabase.from('children').insert({ ...row, family_id: familyId }).select().single()
    const { data, error: err } = await q
    setBusy(false)
    if (err) return setError(zhError(err))
    onSaved?.(data)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar child={preview} size={52} />
        <div className="text-sm">
          <div className="font-medium">{nickname || '孩子的暱稱'}</div>
          <div className="text-ink-soft">{ageText(preview) || '年紀未填'}</div>
        </div>
      </div>

      <label className="field">
        暱稱（不必用真實姓名）
        <input id="child-nickname" className="input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} placeholder="例如：小明" autoComplete="off" />
      </label>

      <div className="field">
        年紀（選填）
        <div className="flex rounded-full bg-paper-2 p-1">
          {[['birth', '出生年月'], ['band', '只選年齡階段']].map(([k, t]) => (
            <button type="button" key={k} onClick={() => setMode(k)}
              className={`flex-1 rounded-full py-1.5 text-[13px] ${mode === k ? 'bg-paper-card font-medium text-ink shadow-sm' : ''}`}>{t}</button>
          ))}
        </div>
        {mode === 'birth' ? (
          <>
            <input id="child-birth" type="month" className="input mt-1" value={birth} min="2005-01" max={thisMonth()} onChange={(e) => setBirth(e.target.value)} />
            <span className="hint">只記到月份，年紀會每個月自動更新。</span>
          </>
        ) : (
          <select id="child-band" className="input mt-1" value={band} onChange={(e) => setBand(e.target.value)}>
            <option value="">不填</option>
            {AGE_BANDS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        )}
      </div>

      <div className="field">
        代表色
        <div className="flex gap-2">
          {AVATAR_COLORS.map((c) => (
            <button type="button" key={c} onClick={() => setColor(c)} aria-label={`選擇顏色 ${c}`}
              className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`} style={{ background: c }} />
          ))}
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-block" disabled={busy}>{busy ? '儲存中…' : submitLabel}</button>
    </form>
  )
}
