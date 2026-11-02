import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

// 用手機後鏡頭掃描書背 ISBN 條碼（EAN-13，978/979 開頭）；雜誌 ISSN 是 977 開頭
export default function Scanner({ onDetected }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | scanning | denied | unsupported | error
  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return }
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]], [DecodeHintType.TRY_HARDER, true]])
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
    let controls
    let done = false
    reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current,
      (result, _err, ctrl) => {
        controls = ctrl
        if (done || !result) return
        const text = result.getText()
        if (/^97[789]\d{10}$/.test(text)) {
          done = true
          navigator.vibrate?.(60)
          ctrl.stop()
          onDetected(text)
        }
      }
    ).then((c) => { controls = c; setStatus('scanning') })
      .catch((e) => setStatus(/Permission|NotAllowed/i.test(e?.name + e?.message) ? 'denied' : 'error'))
    return () => { done = true; controls?.stop() }
  }, [onDetected])

  const msg = {
    starting: '正在開啟相機…',
    scanning: '把書背的條碼放進框框裡',
    denied: '沒有相機權限。請到瀏覽器設定允許這個網站使用相機，或改用下方手動輸入 ISBN。',
    unsupported: '這個瀏覽器無法使用相機掃描，請改用下方手動輸入 ISBN。',
    error: '相機無法啟動（可能被其他 App 佔用），請改用下方手動輸入 ISBN。'
  }[status]

  return (
    <div className="relative h-56 overflow-hidden rounded-2xl bg-[#2F2A25]">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {status === 'scanning' && (
        <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-xl border-2 border-gold/80 shadow-[0_0_0_999px_rgba(47,42,37,.35)]">
          <div className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-gold" />
        </div>
      )}
      <p className={`absolute inset-x-0 bottom-0 px-4 py-2 text-center text-[13px] text-paper ${status === 'scanning' ? 'bg-[#2F2A25]/50' : 'top-0 grid place-items-center'}`}>{msg}</p>
    </div>
  )
}
