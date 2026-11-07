import { prefersCalm } from '../lib/prefs'

/* 12 月的雪：一片一片慢慢飄下來（只是裝飾，不能點）。dense＝大雪 */
export default function Snow({ dense = false }) {
  const calm = prefersCalm()
  const n = calm ? 8 : dense ? 44 : 26
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const size = 3 + ((i * 7) % 5) // 3～7px
        return (
          <span key={i} className={calm ? 'sf-flake sf-flake-still' : 'sf-flake'}
            style={{
              left: `${(i * 37.3) % 100}%`, top: calm ? `${(i * 23) % 90}%` : undefined,
              width: size, height: size, opacity: 0.55 + (size - 3) * 0.1,
              '--sw': `${(i % 2 ? 1 : -1) * (10 + (i % 4) * 6)}px`,
              animationDuration: `${7 + (i % 6) * 1.6}s`, animationDelay: `-${(i * 1.3) % 9}s`
            }} />
        )
      })}
    </div>
  )
}
