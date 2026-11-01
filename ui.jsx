import { useEffect, useState } from 'react'

export function Splash({ text = '載入中…' }) {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-center text-ink-soft">
        <Seedling className="mx-auto mb-3 w-20 animate-pulse" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  )
}

export function ErrorScreen({ message, onRetry }) {
  return (
    <div className="page grid min-h-screen place-items-center">
      <div className="w-full text-center">
        <Seedling className="mx-auto mb-4 w-20 opacity-60" />
        <div className="error-box mb-4 text-left">{message}</div>
        {onRetry && <button className="btn" onClick={onRetry}>再試一次</button>}
      </div>
    </div>
  )
}

export function Avatar({ child, size = 28 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-hand font-bold text-white"
      style={{ width: size, height: size, background: child?.avatar_color || '#83A48A', fontSize: size * 0.48 }}
      aria-hidden="true"
    >
      {child?.nickname?.slice(-1) || '?'}
    </span>
  )
}

export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#3E3832]/35" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0">
        <div
          className="mx-auto max-h-[88vh] max-w-[480px] overflow-y-auto rounded-t-[22px] bg-paper px-[18px] pt-2 shadow-[0_-6px_24px_rgba(62,56,50,.15)]"
          style={{ paddingBottom: 'calc(22px + env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded bg-line" />
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="h-hand text-xl">{title}</h3>
            <button className="h-8 w-8 shrink-0 rounded-full bg-paper-2" onClick={onClose} aria-label="關閉">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Toaster() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let t
    const on = (e) => {
      setMsg(e.detail)
      clearTimeout(t)
      t = setTimeout(() => setMsg(''), 2600)
    }
    window.addEventListener('app-toast', on)
    return () => { window.removeEventListener('app-toast', on); clearTimeout(t) }
  }, [])
  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[60] max-w-[calc(100%-40px)] -translate-x-1/2 rounded-full bg-[#3E3832] px-5 py-2.5 text-center text-sm text-paper transition ${msg ? 'opacity-100' : 'translate-y-4 opacity-0'}`}
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
    >
      {msg}
    </div>
  )
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on) }
  }, [])
  if (!offline) return null
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-[#EFE3C4] px-4 py-2 text-center text-[13px]" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
      目前離線：已載入的內容可以看，儲存或登入要等網路恢復。
    </div>
  )
}

export function Seedling({ className = '' }) {
  return (
    <svg viewBox="0 0 120 110" className={className} aria-hidden="true">
      <defs>
        <filter id="wc-s" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
      </defs>
      <ellipse cx="60" cy="98" rx="46" ry="6" fill="#A5B6A0" opacity=".45" filter="url(#wc-s)" />
      <path d="M60 98 Q57 80 61 62" stroke="#98775F" strokeWidth="3.4" fill="none" strokeLinecap="round" filter="url(#wc-s)" />
      <path d="M61 66 C52 58 40 58 33 64 C40 72 53 72 61 66Z" fill="#83A48A" opacity=".9" filter="url(#wc-s)" />
      <path d="M61 62 C66 50 78 46 87 48 C84 58 72 64 61 62Z" fill="#D6B65E" opacity=".85" filter="url(#wc-s)" />
    </svg>
  )
}
