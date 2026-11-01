import { useCallback, useEffect, useState } from 'react'
import { supabase, isConfigured } from './lib/supabase'
import { zhError } from './lib/errors'
import { Splash, ErrorScreen, Toaster, OfflineBanner, Seedling } from './components/ui'
import ChildForm from './components/ChildForm'
import SetupMissing from './pages/SetupMissing'
import AuthPage from './pages/AuthPage'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Shell from './pages/Shell'

export default function App() {
  return (
    <>
      <OfflineBanner />
      {isConfigured ? <AuthGate /> : <SetupMissing />}
      <Toaster />
    </>
  )
}

function AuthGate() {
  const [session, setSession] = useState(undefined)
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <Splash />
  if (recovery && session) return <ResetPassword onDone={() => setRecovery(false)} />
  if (!session) return <AuthPage />
  return <FamilyGate key={session.user.id} session={session} />
}

// 讀取「我屬於哪個家庭、有哪些孩子」
function useFamilyData(userId) {
  const [state, setState] = useState({ loading: true, error: null, family: null, role: null, children: [], profile: null })

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, error: null }))
    const [mem, prof] = await Promise.all([
      supabase.from('family_members').select('role, families(id, name)').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('id, display_name').eq('id', userId).maybeSingle()
    ])
    if (mem.error || prof.error) return setState((s) => ({ ...s, loading: false, error: mem.error || prof.error }))
    let children = []
    if (mem.data?.families) {
      const ch = await supabase.from('children').select('*').eq('family_id', mem.data.families.id).order('sort_order').order('created_at')
      if (ch.error) return setState((s) => ({ ...s, loading: false, error: ch.error }))
      children = ch.data
    }
    setState({ loading: false, error: null, family: mem.data?.families || null, role: mem.data?.role || null, children, profile: prof.data })
  }, [userId])

  useEffect(() => { reload() }, [reload])
  return { ...state, reload }
}

function FamilyGate({ session }) {
  const data = useFamilyData(session.user.id)
  if (data.loading) return <Splash text="正在打開你的書房…" />
  if (data.error) return <ErrorScreen message={zhError(data.error)} onRetry={data.reload} />
  if (!data.family) return <Onboarding onDone={data.reload} />
  if (!data.children.length) return <FirstChild familyId={data.family.id} onDone={data.reload} />
  return <Shell session={session} data={data} reload={data.reload} />
}

function FirstChild({ familyId, onDone }) {
  return (
    <div className="page flex min-h-screen flex-col justify-center py-10">
      <Seedling className="mx-auto w-20" />
      <h1 className="h-hand mt-2 text-center text-2xl">為孩子種下第一棵樹</h1>
      <p className="mb-6 mt-1 text-center text-[13px] text-ink-soft">先建立一位孩子，之後隨時可以在設定裡新增第二位。</p>
      <ChildForm familyId={familyId} submitLabel="開始記錄" onSaved={onDone} />
    </div>
  )
}
