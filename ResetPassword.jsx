import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'

export default function ResetPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (pw.length < 8) return setError('密碼至少要 8 個字元。')
    if (pw !== pw2) return setError('兩次輸入的密碼不一樣。')
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (err) return setError(zhError(err))
    toast('密碼已更新')
    onDone()
  }

  return (
    <div className="page flex min-h-screen flex-col justify-center py-10">
      <h1 className="h-hand mb-5 text-2xl">設定新密碼</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="field">新密碼（至少 8 個字元）
          <input id="new-pw" type="password" className="input" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <label className="field">再輸入一次
          <input id="new-pw2" type="password" className="input" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-block" disabled={busy}>{busy ? '更新中…' : '更新密碼'}</button>
      </form>
    </div>
  )
}
