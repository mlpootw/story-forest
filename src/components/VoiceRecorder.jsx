import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { zhError } from '../lib/errors'
import { toast } from '../lib/toast'
import { VOICE_LINES, loadVoices, playUrl } from '../lib/sound'

/*
  錄小樹的聲音：每一句按住錄、放開停（最多 5 秒），可以試聽、重錄、刪除
  錄音存在自己家的 Supabase（voices 空間），兒童模式會播放；沒錄的句子不出聲
*/
const MAX_MS = 5000

export default function VoiceRecorder({ familyId }) {
  const [have, setHave] = useState(null) // Map key -> url
  const [rec, setRec] = useState(null) // 正在錄的 key
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const mr = useRef(null)
  const held = useRef(false)
  const timer = useRef()

  async function refresh() {
    const m = await loadVoices(supabase, familyId, true)
    setHave(new Map(m))
  }
  useEffect(() => {
    (async () => {
      const { error } = await supabase.storage.from('voices').list(familyId)
      if (error) setErr(/not found|bucket/i.test(error.message) ? '請先到 Supabase 執行「小樹的聲音」那份更新 SQL' : zhError(error))
      refresh()
    })()
    return () => { clearInterval(timer.current); mr.current?.stream?.getTracks().forEach((t) => t.stop()) }
  }, [familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function start(key, e) {
    e.preventDefault()
    if (rec || busy) return
    held.current = true
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      toast('沒辦法使用麥克風。請在瀏覽器設定允許這個網站使用麥克風')
      return
    }
    // 第一次會先跳出麥克風權限，這時手指可能已經放開了
    if (!held.current) { stream.getTracks().forEach((t) => t.stop()); toast('麥克風可以用了！再按住一次開始錄音'); return }
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported?.(t)) || ''
    const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    const chunks = []
    r.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data)
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      clearInterval(timer.current)
      setRec(null)
      const blob = new Blob(chunks, { type: (r.mimeType || type || 'audio/webm').split(';')[0] })
      if (blob.size < 1500) { toast('太短了，按住久一點再說'); return }
      setBusy(key)
      const { error } = await supabase.storage.from('voices').upload(`${familyId}/${key}`, blob, { upsert: true, contentType: blob.type, cacheControl: '60' })
      setBusy('')
      if (error) { toast(zhError(error)); return }
      await refresh()
      playUrl(URL.createObjectURL(blob))
      toast('錄好了！正在播放給你聽')
    }
    r.stream = stream
    mr.current = r
    r.start()
    setRec(key)
    const t0 = Date.now()
    setLeft(MAX_MS)
    timer.current = setInterval(() => {
      const l = MAX_MS - (Date.now() - t0)
      setLeft(l)
      if (l <= 0) stop()
    }, 100)
  }
  function stop() {
    held.current = false
    clearInterval(timer.current)
    if (mr.current && mr.current.state === 'recording') mr.current.stop()
  }
  async function remove(key) {
    setBusy(key)
    const { error } = await supabase.storage.from('voices').remove([`${familyId}/${key}`])
    setBusy('')
    if (error) return toast(zhError(error))
    await refresh()
    toast('已刪除，這句會改成不出聲')
  }

  return (
    <div className="flex flex-col gap-2">
      {err && <div className="error-box">{err}</div>}
      {VOICE_LINES.map((l) => {
        const url = have?.get(l.key)
        const recording = rec === l.key
        return (
          <div key={l.key} className={`rounded-2xl border p-3 ${recording ? 'border-danger bg-[#F8ECE8]' : 'border-line bg-paper-card'}`}>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <b className="block text-[15px]">「{l.text}」</b>
                <span className="text-[12px] text-ink-soft">{l.when}</span>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${url ? 'bg-sage-mist text-sage-deep' : 'bg-paper-2 text-ink-soft'}`}>{url ? '已錄好' : '還沒錄'}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                className={`flex flex-1 touch-none select-none items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium text-white ${recording ? 'bg-danger' : 'bg-sage'}`}
                disabled={!!err || (busy && busy !== l.key) || (rec && !recording)}
                onPointerDown={(e) => start(l.key, e)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onContextMenu={(e) => e.preventDefault()}>
                {recording ? `🔴 錄音中…放開就停（${Math.max(0, Math.ceil(left / 1000))}）` : busy === l.key ? '儲存中…' : url ? '🎙️ 按住重錄' : '🎙️ 按住錄音'}
              </button>
              {url && <button className="btn-ghost px-3 py-2 text-sm" onClick={() => playUrl(url)}>▶ 試聽</button>}
              {url && <button className="px-2 text-xs text-ink-soft" disabled={!!busy} onClick={() => remove(l.key)}>刪除</button>}
            </div>
          </div>
        )
      })}
      <p className="hint">按住按鈕說話，說完放開。每句最多 5 秒。錄音只存在你們家的資料庫，只有家人聽得到。</p>
    </div>
  )
}
