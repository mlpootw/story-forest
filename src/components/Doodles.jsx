// 蠟筆／色鉛筆感的手繪小插圖（純裝飾，不影響操作）
// 用法：在頁面放一次 <CrayonDefs />，其他插圖都會套用同一個蠟筆濾鏡

const INK = '#7A6553'
const line = { fill: 'none', stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function CrayonDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {/* 線條微微抖動 + 蠟筆顆粒 */}
        <filter id="sf-crayon" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05" result="ga" />
          <feComposite in="d" in2="ga" operator="in" />
        </filter>
        {/* 色鉛筆斜線塗色 */}
        {[['sun', '#F2B84B'], ['sky', '#8FC1D4'], ['berry', '#E89A84'], ['leaf', '#9BBF8F'], ['pink', '#F2B9C4'], ['lilac', '#C3B3D9']].map(([k, c]) => (
          <pattern key={k} id={`sf-hatch-${k}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="4" height="4" fill={c} opacity=".45" />
            <line x1="0" y1="0" x2="0" y2="4" stroke={c} strokeWidth="2.6" />
          </pattern>
        ))}
      </defs>
    </svg>
  )
}

const Svg = ({ className = '', children, vb = '0 0 64 64', style }) => (
  <svg viewBox={vb} className={`pointer-events-none select-none ${className}`} style={style} aria-hidden="true" focusable="false">
    <g filter="url(#sf-crayon)">{children}</g>
  </svg>
)

export const Bunny = (p) => (
  <Svg {...p}>
    <path d="M25 24C20 12 21 3 25.5 3.5S30 14 29.5 23" {...line} fill="#FFFDF8" />
    <path d="M25.5 20C24 13 24 7 25.5 7" stroke="#F2B9C4" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M35 23C35 13 38 4 42 5s1 12-3.5 19" {...line} fill="#FFFDF8" />
    <path d="M38.5 19C39 13 40 9 41 9" stroke="#F2B9C4" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M19 49c0-9 6-14 13-14s13 5 13 14c0 6-6 9-13 9s-13-3-13-9z" {...line} fill="#FFFDF8" />
    <circle cx="32" cy="31" r="11" {...line} fill="#FFFDF8" />
    <circle cx="28" cy="30" r="1.6" fill={INK} /><circle cx="36" cy="30" r="1.6" fill={INK} />
    <path d="M30.5 34.2q1.5 1.6 3 0" {...line} strokeWidth="1.8" />
    <circle cx="25" cy="34" r="2.6" fill="url(#sf-hatch-pink)" /><circle cx="39" cy="34" r="2.6" fill="url(#sf-hatch-pink)" />
    <ellipse cx="25" cy="57" rx="5" ry="2.6" {...line} fill="#FFFDF8" /><ellipse cx="39" cy="57" rx="5" ry="2.6" {...line} fill="#FFFDF8" />
    <circle cx="46" cy="50" r="3.6" {...line} fill="#FFFDF8" />
  </Svg>
)

export const Bird = (p) => (
  <Svg {...p}>
    <path d="M10 38c0-10 8-17 19-17 6 0 10 2 13 5 3-1 6 0 8 2l-5 3c1 2 1 4 1 6 0 9-8 14-18 14-10 0-18-5-18-13z" {...line} fill="url(#sf-hatch-sky)" />
    <path d="M50 28l7 1-6 4" {...line} fill="url(#sf-hatch-sun)" />
    <circle cx="42" cy="30" r="1.7" fill={INK} />
    <path d="M18 38c5 6 12 6 16 1" {...line} />
    <path d="M11 37l-7-5 2 8" {...line} />
    <path d="M25 51v7M31 51v7M23 58h5M29 58h5" {...line} strokeWidth="2" />
  </Svg>
)

export const Star = ({ color = 'sun', ...p }) => (
  <Svg {...p}>
    <path d="M32 6l7 16 17 2-13 11 4 17-15-9-15 9 4-17L8 24l17-2z" {...line} fill={`url(#sf-hatch-${color})`} />
  </Svg>
)

export const Sun = (p) => (
  <Svg {...p}>
    <circle cx="32" cy="32" r="12" {...line} fill="url(#sf-hatch-sun)" />
    <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.5 13.5l5.5 5.5M45 45l5.5 5.5M13.5 50.5l5.5-5.5M45 19l5.5-5.5" {...line} stroke="#E0A33A" />
    <circle cx="28" cy="30" r="1.4" fill={INK} /><circle cx="36" cy="30" r="1.4" fill={INK} />
    <path d="M28.5 35q3.5 3 7 0" {...line} strokeWidth="1.8" />
  </Svg>
)

export const Cloud = (p) => (
  <Svg vb="0 0 80 48" {...p}>
    <path d="M18 40c-8 0-12-5-11-10 1-6 7-8 12-6 1-9 9-14 18-12 6 1 10 5 11 10 3-3 9-4 13 0 4 3 4 9 1 12-1 4-5 6-10 6z" {...line} stroke="#8FB3C2" fill="#FFFFFF" />
  </Svg>
)

export const Snail = (p) => (
  <Svg vb="0 0 72 48" {...p}>
    <path d="M6 42c8 0 40 1 56-1 5-1 7-5 6-9-1-3-4-4-6-2" {...line} fill="url(#sf-hatch-leaf)" />
    <path d="M62 30l-2-12M66 31l3-11" {...line} strokeWidth="2" /><circle cx="60" cy="17" r="2" fill={INK} /><circle cx="69.5" cy="19" r="2" fill={INK} />
    <circle cx="34" cy="26" r="16" {...line} fill="url(#sf-hatch-berry)" />
    <path d="M34 26c0-3 4-3 4 0 0 5-8 5-8 0 0-7 12-7 12 0 0 9-16 9-16 0" {...line} strokeWidth="2" />
  </Svg>
)

export const Flower = ({ color = 'pink', ...p }) => (
  <Svg vb="0 0 40 64" {...p}>
    <path d="M20 30v32M20 50c-6-2-10-7-10-11 5 0 9 4 10 8M20 46c5-2 9-6 9-10-5 0-8 4-9 7" {...line} stroke="#7FA676" />
    {[[20, 9], [30, 16], [27, 28], [13, 28], [10, 16]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7" {...line} fill={`url(#sf-hatch-${color})`} />)}
    <circle cx="20" cy="19" r="5" {...line} fill="url(#sf-hatch-sun)" />
  </Svg>
)

export const Heart = (p) => (
  <Svg {...p}>
    <path d="M32 54C14 42 6 32 8 22c2-9 13-12 20-5l4 4 4-4c7-7 18-4 20 5 2 10-6 20-24 32z" {...line} fill="url(#sf-hatch-berry)" />
  </Svg>
)

// 標題下的蠟筆波浪線
export const Squiggle = ({ className = '', color = '#F2B84B' }) => (
  <svg viewBox="0 0 120 12" className={`pointer-events-none ${className}`} aria-hidden="true" focusable="false" preserveAspectRatio="none">
    <g filter="url(#sf-crayon)"><path d="M3 7c8-6 14 4 22 0s14-6 22 0 14 4 22 0 14-6 22 0 14 4 26-1" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" /></g>
  </svg>
)

/* ---------- 底部選單：手繪彩色圖示 ---------- */
export const NavIcons = {
  garden: (
    <>
      <path d="M32 58V38" stroke="#9A7559" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M32 44l-7-6M32 42l6-5" stroke="#9A7559" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M14 30c-4-8 2-17 10-16 2-7 14-9 18-2 8-1 13 8 9 15 4 6-2 14-9 12-4 5-13 5-17 0-8 2-14-3-11-9z" {...line} fill="url(#sf-hatch-leaf)" />
      <circle cx="24" cy="24" r="3" fill="url(#sf-hatch-berry)" /><circle cx="40" cy="30" r="3" fill="url(#sf-hatch-berry)" />
      <path d="M18 58h28" {...line} />
    </>
  ),
  calendar: (
    <>
      <rect x="9" y="13" width="46" height="44" rx="7" {...line} fill="#FFFDF8" />
      <path d="M9 20a7 7 0 0 1 7-7h32a7 7 0 0 1 7 7v7H9z" {...line} fill="url(#sf-hatch-berry)" />
      <path d="M21 7v12M43 7v12" {...line} strokeWidth="3" />
      <circle cx="22" cy="37" r="3" fill="url(#sf-hatch-leaf)" /><circle cx="32" cy="37" r="3" fill="url(#sf-hatch-sun)" /><circle cx="42" cy="37" r="3" fill="url(#sf-hatch-sky)" /><circle cx="22" cy="47" r="3" fill="url(#sf-hatch-lilac)" />
    </>
  ),
  library: (
    <>
      <path d="M32 18c-7-5-15-6-24-4v36c9-2 17-1 24 4z" {...line} fill="url(#sf-hatch-sky)" />
      <path d="M32 18c7-5 15-6 24-4v36c-9-2-17-1-24 4z" {...line} fill="url(#sf-hatch-sun)" />
      <path d="M32 18v36" {...line} />
      <path d="M14 24c4-1 8 0 12 1M14 31c4-1 8 0 12 1M38 25c4-1 8-2 12-1M38 32c4-1 8-2 12-1" {...line} strokeWidth="1.8" />
    </>
  ),
  report: (
    <>
      <path d="M14 7h26l11 11v39H14z" {...line} fill="#FFFDF8" />
      <path d="M40 7v11h11" {...line} />
      <rect x="20" y="40" width="6" height="11" rx="1.5" {...line} strokeWidth="1.8" fill="url(#sf-hatch-leaf)" />
      <rect x="29.5" y="31" width="6" height="20" rx="1.5" {...line} strokeWidth="1.8" fill="url(#sf-hatch-sun)" />
      <rect x="39" y="36" width="6" height="15" rx="1.5" {...line} strokeWidth="1.8" fill="url(#sf-hatch-berry)" />
    </>
  )
}

/* ---------- 可愛小水壺（花園入口、孩子模式共用） ---------- */
export const CuteCan = ({ className = '', face = 'smile' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
    <g filter="url(#sf-crayon)">
      <path d="M21 26c0-8 4.5-12.5 10-12.5S41 18 41 26" {...line} strokeWidth="3.6" stroke="#6E93A3" />
      <path d="M43 33l11-10.5" {...line} strokeWidth="7" stroke="#6E93A3" />
      <path d="M43 33l11-10.5" {...line} strokeWidth="4" stroke="#9CC6D6" />
      <ellipse cx="56" cy="21" rx="4.4" ry="3" transform="rotate(-42 56 21)" {...line} fill="#9CC6D6" />
      <path d="M13 28c0-3 3-4 6-4h24c3 0 6 1 6 4l-2.4 21c-.6 5-4.4 8-9.4 8H24.8c-5 0-8.8-3-9.4-8z" {...line} fill="#A9D0DE" />
      <path d="M13 28c0-3 3-4 6-4h24c3 0 6 1 6 4l-2.4 21c-.6 5-4.4 8-9.4 8H24.8c-5 0-8.8-3-9.4-8z" fill="url(#sf-hatch-sky)" />
      <path d="M15 31h33" {...line} strokeWidth="1.6" stroke="#6E93A3" />
    </g>
    <circle cx="20.5" cy="35" r="2.2" fill="#fff" opacity=".7" />
    {face === 'smile' && (
      <g>
        <circle cx="25.5" cy="40" r="2" fill="#2F2A25" /><circle cx="26.2" cy="39.3" r=".7" fill="#fff" />
        <circle cx="37.5" cy="40" r="2" fill="#2F2A25" /><circle cx="38.2" cy="39.3" r=".7" fill="#fff" />
        <path d="M28.6 45q2.9 2.8 5.8 0" fill="none" stroke="#2F2A25" strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="22" cy="45" rx="2.6" ry="1.6" fill="#EE9C9C" opacity=".8" /><ellipse cx="41" cy="45" rx="2.6" ry="1.6" fill="#EE9C9C" opacity=".8" />
      </g>
    )}
    <g transform="translate(44 51)" filter="url(#sf-crayon)">
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cy="-2.6" rx="1.8" ry="2.4" fill="#F2B9C4" transform={`rotate(${a})`} />)}
      <circle r="1.4" fill="#F2B84B" />
    </g>
  </svg>
)
