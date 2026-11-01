import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { Seedling } from '../components/ui'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchTo = (m) => { setMode(m); setError(''); setInfo('') }

  async function submit(e) {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim()) return setError('請輸入 Email。')
    if (mode !== 'forgot' && password.length < 8) return setError('密碼至少要 8 個字元。')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (err) throw err
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(), password, options: { emailRedirectTo: window.location.origin }
        })
        if (err) throw err
        if (!data.session) setInfo('註冊成功！請到信箱點確認連結，完成後回來登入。（找不到信的話，看看垃圾郵件匣）')
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
        if (err) throw err
        setInfo('如果這個 Email 有註冊，重設密碼的信已經寄出，請到信箱點連結。')
      }
    } catch (err) {
      setError(zhError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page flex min-h-screen flex-col justify-center py-10">
      <div className="mb-8 text-center">
        <Seedling className="mx-auto w-24" />
        <h1 className="h-hand mt-2 text-[26px]">小小書房｜故事森林</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">每一本故事，都是一片葉子。<br />每個月長成一棵樹，一年過去，就擁有一座自己的閱讀森林。</p>
      </div>

      {mode !== 'forgot' && (
        <div className="mb-5 flex rounded-full bg-paper-2 p-1">
          {[['login', '登入'], ['signup', '註冊新帳號']].map(([k, t]) => (
            <button key={k} type="button" onClick={() => switchTo(k)}
              className={`flex-1 rounded-full py-2 text-sm ${mode === k ? 'bg-paper-card font-medium shadow-sm' : 'text-ink-soft'}`}>{t}</button>
          ))}
        </div>
      )}
      {mode === 'forgot' && <h2 className="h-hand mb-4 text-xl">重設密碼</h2>}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="field">Email
          <input id="auth-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        {mode !== 'forgot' && (
          <label className="field">密碼{mode === 'signup' && '（至少 8 個字元）'}
            <input id="auth-password" className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {error && <div className="error-box">{error}</div>}
        {info && <div className="notice">{info}</div>}
        <button className="btn btn-block" disabled={busy}>
          {busy ? '請稍候…' : mode === 'login' ? '登入' : mode === 'signup' ? '註冊' : '寄送重設密碼信'}
        </button>
      </form>

      <div className="mt-5 text-center text-[13px]">
        {mode === 'forgot'
          ? <button className="text-ink-soft underline" onClick={() => switchTo('login')}>回到登入</button>
          : <button className="text-ink-soft underline" onClick={() => switchTo('forgot')}>忘記密碼？</button>}
      </div>
      <p className="hint mt-8 text-center">每個家庭的紀錄彼此獨立，孩子的資料預設不公開。</p>
    </div>
  )
}
