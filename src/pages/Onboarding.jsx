import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { Seedling } from '../components/ui'

// 第一次登入：建立自己的家庭，或用邀請碼加入另一半的家庭
export default function Onboarding({ onDone }) {
  const [mode, setMode] = useState('create')
  const [familyName, setFamilyName] = useState('我們家的故事森林')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) return setError('請填寫你在家裡的稱呼，例如「媽媽」。')
    if (mode === 'join' && code.replace(/\s/g, '').length !== 8) return setError('邀請碼是 8 碼英文與數字。')
    setBusy(true)
    const { error: err } = mode === 'create'
      ? await supabase.rpc('create_family', { p_family_name: familyName, p_display_name: displayName })
      : await supabase.rpc('join_family', { p_code: code.replace(/\s/g, ''), p_display_name: displayName })
    setBusy(false)
    if (err) return setError(zhError(err))
    onDone()
  }

  return (
    <div className="page flex min-h-screen flex-col justify-center py-10">
      <Seedling className="mx-auto w-20" />
      <h1 className="h-hand mt-2 text-center text-2xl">歡迎來到故事森林</h1>
      <p className="mb-6 mt-1 text-center text-[13px] text-ink-soft">先建立你們家的書房，或加入另一位家長已建立的家庭。</p>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {[['create', '建立我的家庭', '第一次使用'], ['join', '我有邀請碼', '加入另一半的家庭']].map(([k, t, s]) => (
          <button key={k} type="button" onClick={() => { setMode(k); setError('') }}
            className={`rounded-2xl border-[1.5px] p-3 text-left ${mode === k ? 'border-sage bg-sage-mist' : 'border-line'}`}>
            <div className="font-medium">{t}</div><div className="text-xs text-ink-soft">{s}</div>
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="field">你在家裡的稱呼
          <input id="display-name" className="input" maxLength={20} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="例如：媽媽、爸爸、阿嬤" />
        </label>
        {mode === 'create' ? (
          <label className="field">家庭名稱
            <input id="family-name" className="input" maxLength={30} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          </label>
        ) : (
          <label className="field">邀請碼（8 碼，大小寫都可以）
            <input id="invite-code" className="input font-mono uppercase tracking-[.3em]" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" />
            <span className="hint">請另一位家長到「設定 → 邀請另一位家長」產生。</span>
          </label>
        )}
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? '請稍候…' : mode === 'create' ? '建立家庭' : '加入家庭'}</button>
      </form>
      <button className="mx-auto mt-6 text-[13px] text-ink-soft underline" onClick={() => supabase.auth.signOut()}>登出</button>
    </div>
  )
}
