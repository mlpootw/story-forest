export const AGE_BANDS = [
  ['0-1', '0–1 歲'],
  ['2-3', '2–3 歲'],
  ['4-5', '4–5 歲'],
  ['6-8', '6–8 歲'],
  ['9+', '9 歲以上']
]
export const AVATAR_COLORS = ['#83A48A', '#BE9582', '#8EAEBB', '#AD9DBD', '#D5A57C', '#C88F99']

// birth_ym 存成 'YYYY-MM-01'
export function ageText(child, today = new Date()) {
  if (child?.birth_ym) {
    const [y, m] = child.birth_ym.split('-').map(Number)
    const months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m)
    if (months < 0) return ''
    const yy = Math.floor(months / 12)
    const mm = months % 12
    if (yy === 0) return `${mm} 個月`
    return mm ? `${yy} 歲 ${mm} 個月` : `${yy} 歲`
  }
  if (child?.age_band) return AGE_BANDS.find(([k]) => k === child.age_band)?.[1] || ''
  return ''
}

export const thisMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
