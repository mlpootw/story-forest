import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { ageText } from '../lib/ages'
import { toast, copyText } from '../lib/toast'
import { Avatar, Sheet } from '../components/ui'
import { getCalm, setCalm } from '../lib/prefs'
import ChildForm from '../components/ChildForm'

const fmtDate = (s) => new Date(s).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })

export default function FamilySettings({ session, data, reload, onBack }) {
  const { family, role, children, profile } = data
  const isOwner = role === 'owner'
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loadErr, setLoadErr] = useState('')
  const [childSheet, setChildSheet] = useState(null) // null | 'new' | child
  const [confirmDelChild, setConfirmDelChild] = useState(false)
  const [busy, setBusy] = useState('')
  const [familyName, setFamilyName] = useState(family.name)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [exportText, setExportText] = useState('')
  const [delWord, setDelWord] = useState('')
  const [confirmMember, setConfirmMember] = useState(null)
  const [calm, setCalmState] = useState(getCalm())

  const loadMembers = useCallback(async () => {
    setLoadErr('')
    const [m, i] = await Promise.all([
      supabase.from('family_members').select('user_id, role, joined_at, profiles(display_name)').eq('family_id', family.id).order('joined_at'),
      supabase.from('family_invites').select('id, code, expires_at').eq('family_id', family.id).is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })
    ])
    if (m.error || i.error) return setLoadErr(zhError(m.error || i.error))
    setMembers(m.data)
    setInvites(i.data)
  }, [family.id])
  useEffect(() => { loadMembers() }, [loadMembers])

  async function run(key, fn, okMsg) {
    setBusy(key)
    try {
      const { error } = await fn()
      if (error) throw error
      if (okMsg) toast(okMsg)
      return true
    } catch (e) {
      toast(zhError(e))
      return false
    } finally {
      setBusy('')
    }
  }

  const createInvite = () => run('invite', async () => {
    const r = await supabase.rpc('create_invite')
    if (!r.error) await loadMembers()
    return r
  }, '已產生邀請碼')

  async function copyCode(code) {
    const text = `邀請你一起記錄孩子的閱讀！\n到 ${window.location.origin} 註冊後，輸入邀請碼：${code}（7 天內有效）`
    toast((await copyText(text)) ? '已複製邀請訊息' : `請手動複製邀請碼：${code}`)
  }

  async function deleteChild(child) {
    const ok = await run('delchild', () => supabase.from('children').delete().eq('id', child.id), `已刪除${child.nickname}的資料`)
    if (ok) { setChildSheet(null); setConfirmDelChild(false); reload() }
  }

  async function exportData() {
    setBusy('export')
    const { data: json, error } = await supabase.rpc('export_my_data')
    setBusy('')
    if (error) return toast(zhError(error))
    const text = JSON.stringify(json, null, 2)
    setExportText(text)
    try {
      const blob = new Blob([text], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `故事森林-匯出-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch { /* 部分瀏覽器不支援下載，下方仍可複製 */ }
  }

  async function deleteAccount() {
    const ok = await run('delacc', () => supabase.rpc('delete_my_account'))
    if (ok) { await supabase.auth.signOut(); toast('帳號已刪除') }
  }

  return (
    <div className="page pb-28">
      <header className="sticky z-20 -mx-4 flex items-center gap-2 bg-paper px-4 py-3" style={{ top: 'env(safe-area-inset-top)' }}>
        <button className="h-10 w-10 rounded-full border border-line" onClick={onBack} aria-label="返回">‹</button>
        <h1 className="h-hand text-xl">家庭設定</h1>
      </header>

      {/* 孩子 */}
      <section className="section">
        <h2 className="h-hand mb-3 text-lg">孩子</h2>
        <ul className="flex flex-col">
          {children.map((c) => (
            <li key={c.id}>
              <button className="flex w-full items-center gap-3 border-b border-line py-3 text-left" onClick={() => { setChildSheet(c); setConfirmDelChild(false) }}>
                <Avatar child={c} size={40} />
                <span className="min-w-0 flex-1"><span className="block font-medium">{c.nickname}</span><span className="text-[13px] text-ink-soft">{ageText(c) || '年紀未填'}</span></span>
                <span className="text-[13px] text-ink-soft">編輯 ›</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="btn-ghost mt-3 w-full" onClick={() => setChildSheet('new')}>＋ 新增孩子</button>
        <p className="hint mt-2">每個孩子有自己的書房、每月閱讀樹和紀錄。</p>
      </section>

      {/* 家庭成員與邀請 */}
      <section className="section">
        <h2 className="h-hand mb-3 text-lg">家庭成員</h2>
        {loadErr && <div className="error-box mb-3">{loadErr} <button className="underline" onClick={loadMembers}>重試</button></div>}
        <ul className="mb-3 flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 text-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper-2 font-hand">{(m.profiles?.display_name || '家')[0]}</span>
              <span className="flex-1">{m.profiles?.display_name || '家長'}{m.user_id === session.user.id && '（你）'}
                <span className="ml-2 text-xs text-ink-soft">{m.role === 'owner' ? '建立者' : '家長'}</span></span>
              {isOwner && m.user_id !== session.user.id && (
                confirmMember === m.user_id
                  ? <span className="flex gap-1"><button className="px-2 text-xs text-ink-soft" onClick={() => setConfirmMember(null)}>取消</button>
                      <button className="btn-danger px-3 py-1 text-xs" onClick={async () => { if (await run('rm', () => supabase.from('family_members').delete().eq('family_id', family.id).eq('user_id', m.user_id), '已移除')) { setConfirmMember(null); loadMembers() } }}>確定移除</button></span>
                  : <button className="text-xs text-ink-soft" onClick={() => setConfirmMember(m.user_id)}>移除</button>
              )}
            </li>
          ))}
        </ul>

        <div className="rounded-2xl bg-paper-2 p-4">
          <p className="mb-1 font-medium">邀請另一位家長</p>
          <p className="hint mb-3">對方註冊後輸入邀請碼，就能一起看、一起記錄。每組碼只能用一次，7 天內有效。</p>
          {invites.map((iv) => (
            <div key={iv.id} className="mb-2 flex items-center gap-2 rounded-xl bg-paper-card px-3 py-2">
              <span className="flex-1 font-mono text-lg tracking-[.25em]">{iv.code}</span>
              <span className="text-[11px] text-ink-soft">至 {fmtDate(iv.expires_at)}</span>
              <button className="btn px-3 py-1 text-xs" onClick={() => copyCode(iv.code)}>複製</button>
              <button className="text-xs text-ink-soft" aria-label="作廢這組邀請碼" onClick={async () => { if (await run('rminv', () => supabase.from('family_invites').delete().eq('id', iv.id), '已作廢')) loadMembers() }}>作廢</button>
            </div>
          ))}
          <button className="btn-gold w-full" disabled={busy === 'invite'} onClick={createInvite}>{busy === 'invite' ? '產生中…' : '產生邀請碼'}</button>
        </div>

        {!isOwner && (
          <button className="mt-3 text-[13px] text-ink-soft underline" onClick={async () => {
            if (await run('leave', () => supabase.from('family_members').delete().eq('family_id', family.id).eq('user_id', session.user.id), '已退出家庭')) reload()
          }}>退出這個家庭</button>
        )}
      </section>

      {/* 家庭與帳號 */}
      <section className="section flex flex-col gap-4">
        <h2 className="h-hand text-lg">家庭與帳號</h2>
        <label className="field">家庭名稱{!isOwner && '（只有建立者可以修改）'}
          <div className="flex gap-2">
            <input id="family-name-edit" className="input" maxLength={30} value={familyName} disabled={!isOwner} onChange={(e) => setFamilyName(e.target.value)} />
            {isOwner && <button className="btn shrink-0" disabled={busy === 'fname' || !familyName.trim() || familyName === family.name}
              onClick={async () => { if (await run('fname', () => supabase.from('families').update({ name: familyName.trim() }).eq('id', family.id), '已更新')) reload() }}>儲存</button>}
          </div>
        </label>
        <label className="field">你在家裡的稱呼
          <div className="flex gap-2">
            <input id="display-name-edit" className="input" maxLength={20} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <button className="btn shrink-0" disabled={busy === 'dname' || displayName === (profile?.display_name || '')}
              onClick={async () => { if (await run('dname', () => supabase.from('profiles').update({ display_name: displayName.trim() || null }).eq('id', session.user.id), '已更新')) { reload(); loadMembers() } }}>儲存</button>
          </div>
        </label>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-soft">登入 Email：{session.user.email}</span>
          <button className="btn-ghost px-4 py-1.5 text-sm" onClick={() => supabase.auth.signOut()}>登出</button>
        </div>
      </section>

      {/* 顯示 */}
      <section className="section">
        <h2 className="h-hand mb-3 text-lg">顯示</h2>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">減少動畫<span className="block text-xs text-ink-soft">澆水、長葉子、小動物的動畫改為直接顯示（只影響這台裝置）</span></p>
          <button role="switch" aria-checked={calm} aria-label="減少動畫" onClick={() => { setCalm(!calm); setCalmState(!calm) }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${calm ? 'bg-sage' : 'bg-paper-3'}`}>
            <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${calm ? 'left-[23px]' : 'left-[3px]'}`} />
          </button>
        </div>
      </section>

      {/* 資料 */}
      <section className="section flex flex-col gap-3">
        <h2 className="h-hand text-lg">我的資料</h2>
        <button className="btn-ghost" disabled={busy === 'export'} onClick={exportData}>{busy === 'export' ? '整理中…' : '匯出全部紀錄（JSON）'}</button>
        {exportText && (
          <div>
            <textarea id="export-text" readOnly className="input h-32 font-mono text-xs" value={exportText} onFocus={(e) => e.target.select()} />
            <button className="mt-1 text-[13px] text-ink-soft underline" onClick={async () => toast((await copyText(exportText)) ? '已複製' : '請長按文字框手動複製')}>複製內容</button>
          </div>
        )}
        <div className="mt-3 rounded-2xl border border-[#E7C9C1] p-4">
          <p className="font-medium text-[#7A4B40]">刪除我的帳號</p>
          <p className="hint mt-1">
            {members.length > 1
              ? '家庭裡還有其他家長，刪除後紀錄會保留給他們' + (isOwner ? '，建立者身分也會交給對方。' : '。')
              : '你是家庭唯一的成員，刪除後所有孩子與閱讀紀錄都會一併刪除，無法復原。建議先匯出。'}
          </p>
          <label className="field mt-3">請輸入「刪除」確認
            <input id="delete-confirm" className="input" value={delWord} onChange={(e) => setDelWord(e.target.value)} />
          </label>
          <button className="btn-danger mt-3 w-full" disabled={delWord !== '刪除' || busy === 'delacc'} onClick={deleteAccount}>{busy === 'delacc' ? '刪除中…' : '永久刪除帳號'}</button>
        </div>
      </section>

      <p className="hint mt-6 text-center">小小書房｜故事森林 · 第二階段</p>

      <Sheet open={!!childSheet} onClose={() => setChildSheet(null)} title={childSheet === 'new' ? '新增孩子' : '編輯孩子資料'}>
        {childSheet && (
          <>
            <ChildForm key={childSheet === 'new' ? 'new' : childSheet.id} familyId={family.id} child={childSheet === 'new' ? null : childSheet}
              submitLabel={childSheet === 'new' ? '新增' : '儲存'}
              onSaved={(c) => { toast(childSheet === 'new' ? `已新增${c.nickname}` : '已儲存'); setChildSheet(null); reload() }} />
            {childSheet !== 'new' && children.length > 0 && (
              <div className="mt-6 border-t border-dashed border-line pt-4">
                {!confirmDelChild
                  ? <button className="text-[13px] text-danger underline" onClick={() => setConfirmDelChild(true)}>刪除{childSheet.nickname}的資料</button>
                  : <div className="error-box">
                      <p>會一併刪除{childSheet.nickname}的書房、閱讀樹與所有共讀紀錄，無法復原。</p>
                      <div className="mt-3 flex gap-2">
                        <button className="btn-ghost flex-1" onClick={() => setConfirmDelChild(false)}>取消</button>
                        <button className="btn-danger flex-1" disabled={busy === 'delchild'} onClick={() => deleteChild(childSheet)}>確定刪除</button>
                      </div>
                    </div>}
              </div>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
