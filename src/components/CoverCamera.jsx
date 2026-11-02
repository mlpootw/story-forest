import { useEffect, useRef, useState } from 'react'

/*
  拍封面：
  1. 開啟後鏡頭，畫面中間有書本形狀的框線（3:4）
  2. 按快門，自動只留框內的部分
  3. 還不準可以拖四個角微調，按「完成」
  相機無法使用時，改用手機的拍照／相簿選擇，一樣可以裁切
*/
const RATIO = 3 / 4 // 寬 / 高

export default function CoverCamera({ onDone, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)
  const [mode, setMode] = useState('starting') // starting | live | nocam | crop
  const [shot, setShot] = useState(null) // { url, w, h }
  const [crop, setCrop] = useState(null) // 圖片像素座標 { x, y, w, h }

  useEffect(() => {
    let alive = true
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setMode('nocam'); return }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = s
        videoRef.current.srcObject = s
        await videoRef.current.play().catch(() => {})
        setMode('live')
      } catch {
        if (alive) setMode('nocam')
      }
    }
    start()
    return () => { alive = false; stopCam() }
  }, [])

  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // 依畫面上框線的位置，換算成照片裡的範圍
  function snap() {
    const v = videoRef.current
    const vw = v.videoWidth
    const vh = v.videoHeight
    if (!vw) return
    const c = document.createElement('canvas')
    c.width = vw; c.height = vh
    c.getContext('2d').drawImage(v, 0, 0, vw, vh)
    const box = v.getBoundingClientRect()
    const scale = Math.max(box.width / vw, box.height / vh) // object-cover
    const shownW = vw * scale
    const shownH = vh * scale
    const offX = (shownW - box.width) / 2
    const offY = (shownH - box.height) / 2
    const fw = Math.min(box.width * 0.78, box.height * 0.72 * RATIO)
    const fh = fw / RATIO
    const fx = (box.width - fw) / 2
    const fy = (box.height - fh) / 2 - box.height * 0.03
    const rect = { x: (fx + offX) / scale, y: (fy + offY) / scale, w: fw / scale, h: fh / scale }
    stopCam()
    c.toBlob((b) => {
      setShot({ url: URL.createObjectURL(b), w: vw, h: vh })
      setCrop(clampRect(rect, vw, vh))
      setMode('crop')
    }, 'image/jpeg', 0.92)
  }

  function pickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      let cw = w * 0.86
      let ch = cw / RATIO
      if (ch > h * 0.86) { ch = h * 0.86; cw = ch * RATIO }
      stopCam()
      setShot({ url, w, h })
      setCrop({ x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch })
      setMode('crop')
    }
    img.src = url
  }

  async function finish() {
    const img = new Image()
    img.src = shot.url
    await img.decode()
    const c = document.createElement('canvas')
    const outW = Math.min(900, Math.round(crop.w))
    c.width = outW
    c.height = Math.round(outW * (crop.h / crop.w))
    c.getContext('2d').drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height)
    c.toBlob((b) => {
      onDone(new File([b], 'cover.jpg', { type: 'image/jpeg' }), URL.createObjectURL(b))
    }, 'image/jpeg', 0.9)
  }

  function retake() {
    if (shot) URL.revokeObjectURL(shot.url)
    setShot(null); setCrop(null)
    setMode('starting')
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then(async (s) => { streamRef.current = s; videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); setMode('live') })
      .catch(() => setMode('nocam'))
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#1F1B18] text-paper" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-between px-4 py-3">
        <button className="rounded-full bg-white/10 px-4 py-1.5 text-sm" onClick={() => { stopCam(); onClose() }}>取消</button>
        <span className="text-sm">{mode === 'crop' ? '拖動四個角，對準封面' : '把封面放進框框裡'}</span>
        <span className="w-14" />
      </div>

      {/* 相機畫面 */}
      <div className={`relative min-h-0 flex-1 overflow-hidden ${mode === 'crop' || mode === 'nocam' ? 'hidden' : ''}`}>
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {mode === 'live' && <FrameGuide />}
        {mode === 'starting' && <p className="absolute inset-0 grid place-items-center text-sm">正在開啟相機…</p>}
      </div>

      {mode === 'nocam' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center text-sm leading-relaxed">
          <p>沒辦法在網頁裡開啟相機。<br />可以改用手機的相機拍，或從相簿選一張。<br />拍完一樣可以裁切。</p>
          <button className="btn" onClick={() => fileRef.current?.click()}>📷 拍照或選照片</button>
        </div>
      )}

      {mode === 'crop' && shot && crop && <Cropper shot={shot} crop={crop} setCrop={setCrop} />}

      <div className="flex items-center justify-around px-6 pb-5 pt-3">
        {mode === 'crop' ? (
          <>
            <button className="rounded-full bg-white/10 px-6 py-3" onClick={retake}>重拍</button>
            <button className="btn px-8 py-3 text-base" onClick={finish}>完成</button>
          </>
        ) : mode === 'live' ? (
          <>
            <button className="w-16 text-xs text-paper/80" onClick={() => fileRef.current?.click()}>從相簿選</button>
            <button aria-label="拍照" onClick={snap} className="grid h-[74px] w-[74px] place-items-center rounded-full border-4 border-white/80">
              <span className="h-[58px] w-[58px] rounded-full bg-white active:scale-90" />
            </button>
            <span className="w-16" />
          </>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickFile} />
    </div>
  )
}

// 框線位置與 snap() 的計算方式一致
function FrameGuide() {
  const ref = useRef(null)
  const [r, setR] = useState(null)
  useEffect(() => {
    const el = ref.current
    const fit = () => {
      const b = el.getBoundingClientRect()
      const fw = Math.min(b.width * 0.78, b.height * 0.72 * RATIO)
      const fh = fw / RATIO
      setR({ w: fw, h: fh, x: (b.width - fw) / 2, y: (b.height - fh) / 2 - b.height * 0.03 })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {r && (
        <div className="absolute rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
          {['left-0 top-0 border-l-4 border-t-4 rounded-tl-md', 'right-0 top-0 border-r-4 border-t-4 rounded-tr-md', 'left-0 bottom-0 border-l-4 border-b-4 rounded-bl-md', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-md'].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-gold ${c}`} />
          ))}
          <span className="absolute inset-x-0 -bottom-7 text-center text-xs text-white/85">封面對齊四個角</span>
        </div>
      )}
    </div>
  )
}

function clampRect(r, W, H) {
  const x = Math.max(0, Math.min(r.x, W - 40))
  const y = Math.max(0, Math.min(r.y, H - 40))
  return { x, y, w: Math.max(40, Math.min(r.w, W - x)), h: Math.max(40, Math.min(r.h, H - y)) }
}

// 裁切：拖四個角或拖整個框
function Cropper({ shot, crop, setCrop }) {
  const wrapRef = useRef(null)
  const [box, setBox] = useState(null) // 顯示尺寸
  const drag = useRef(null)

  useEffect(() => {
    const el = wrapRef.current
    const fit = () => {
      const r = el.getBoundingClientRect()
      const s = Math.min(r.width / shot.w, r.height / shot.h)
      setBox({ s, w: shot.w * s, h: shot.h * s, left: (r.width - shot.w * s) / 2, top: (r.height - shot.h * s) / 2 })
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [shot])

  function down(e, handle) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { handle, sx: e.clientX, sy: e.clientY, start: { ...crop } }
  }
  function move(e) {
    const d = drag.current
    if (!d || !box) return
    const dx = (e.clientX - d.sx) / box.s
    const dy = (e.clientY - d.sy) / box.s
    let { x, y, w, h } = d.start
    const min = 60
    if (d.handle === 'move') { x += dx; y += dy }
    if (d.handle.includes('l')) { const nx = Math.min(x + w - min, x + dx); w += x - nx; x = nx }
    if (d.handle.includes('r')) w = Math.max(min, w + dx)
    if (d.handle.includes('t')) { const ny = Math.min(y + h - min, y + dy); h += y - ny; y = ny }
    if (d.handle.includes('b')) h = Math.max(min, h + dy)
    x = Math.max(0, Math.min(x, shot.w - w))
    y = Math.max(0, Math.min(y, shot.h - h))
    w = Math.min(w, shot.w - x)
    h = Math.min(h, shot.h - y)
    setCrop({ x, y, w, h })
  }
  const up = () => { drag.current = null }

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 touch-none select-none overflow-hidden" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {box && (
        <div className="absolute" style={{ left: box.left, top: box.top, width: box.w, height: box.h }}>
          <img src={shot.url} alt="拍到的封面" className="h-full w-full" draggable={false} />
          <div className="absolute cursor-move border-2 border-gold shadow-[0_0_0_9999px_rgba(0,0,0,.55)]"
            style={{ left: crop.x * box.s, top: crop.y * box.s, width: crop.w * box.s, height: crop.h * box.s }}
            onPointerDown={(e) => down(e, 'move')}>
            {[['tl', '-left-4 -top-4'], ['tr', '-right-4 -top-4'], ['bl', '-left-4 -bottom-4'], ['br', '-right-4 -bottom-4']].map(([k, pos]) => (
              <span key={k} onPointerDown={(e) => down(e, k)} className={`absolute grid h-8 w-8 place-items-center ${pos}`}>
                <span className="h-5 w-5 rounded-full border-2 border-white bg-gold shadow" />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
