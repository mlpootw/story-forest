// 雜誌花圃：每個月開台灣那個季節真的會開的花
// palette：同一本雜誌固定用其中一個顏色
export const MONTH_FLOWERS = {
  1: { name: '油菜花', kind: 'cluster', palette: [['#F2D35B', '#E5C04A'], ['#F5DC6E', '#E3BD3F']] },
  2: { name: '三色堇', kind: 'pansy', palette: [['#9B86C4', '#F2D35B'], ['#E6A0B4', '#F6E7A0'], ['#7E9FD0', '#F4E9C9']] },
  3: { name: '魯冰花', kind: 'spike', palette: [['#A893CF', '#8C78B8'], ['#E3A6C2', '#C98AA8'], ['#F2E6F0', '#D7C6DA']] },
  4: { name: '海芋', kind: 'calla', palette: [['#FBFAF4', '#F2D35B'], ['#F7E8EC', '#F2D35B']] },
  5: { name: '繡球花', kind: 'hydrangea', palette: [['#8FB3DA', '#7A9ECB'], ['#C7A3D6', '#B08CC4'], ['#E9A9BE', '#D88FA8']] },
  6: { name: '向日葵', kind: 'sunflower', palette: [['#F2C43C', '#8A5A3C']] },
  7: { name: '牽牛花', kind: 'trumpet', palette: [['#8E7BCB', '#F6F1FB'], ['#6F95D8', '#F3F6FC'], ['#D985B4', '#FBF0F6']] },
  8: { name: '百日草', kind: 'zinnia', palette: [['#EE8F84', '#D8705F'], ['#F4B35E', '#E2963C'], ['#E58AB0', '#CF6E97']] },
  9: { name: '金針花', kind: 'lily', palette: [['#F29B42', '#E0812E'], ['#F4B24E', '#E2963C']] },
  10: { name: '大波斯菊', kind: 'cosmos', palette: [['#EFA3C1', '#F2D35B'], ['#F6E4EC', '#F2D35B'], ['#D46C9A', '#F2D35B']] },
  11: { name: '菊花', kind: 'mum', art: { open: 'mum-open', bud: 'mum-bud' }, palette: [['#F2C94C', '#E0A93A'], ['#F2A65A', '#DE8A3E'], ['#D98BB5', '#C06E9C']] },
  12: { name: '聖誕紅', kind: 'poinsettia', palette: [['#D9504A', '#F2D35B'], ['#B8343A', '#F2D35B'], ['#E58A9A', '#F2D35B']] }
}
export const flowerOf = (ym) => MONTH_FLOWERS[Number(String(ym).slice(5, 7))] || MONTH_FLOWERS[1]

const f = (n) => Number(n).toFixed(1)
// 畫一朵花的花頭（中心在 0,0），r 是大小
export function flowerHead(kind, r, [c1, c2]) {
  const ring = (n, cy, rx, ry, fill, rot0 = 0) => Array.from({ length: n }, (_, k) => `<ellipse cy="-${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" transform="rotate(${f(rot0 + (360 / n) * k)})"/>`).join('')
  switch (kind) {
    case 'cluster': // 油菜花：一串小黃花
      return [[-3, 1], [3, 1], [0, -3], [-2.5, -6], [2.5, -6], [0, -9]].map(([x, y]) => `<g transform="translate(${f(x * r / 5)},${f(y * r / 5)})">${ring(4, r * 0.22, r * 0.2, r * 0.26, c1, 45)}<circle r="${f(r * 0.12)}" fill="${c2}"/></g>`).join('')
    case 'pansy': // 三色堇：上兩片大花瓣、下三片
      return `<ellipse cx="-${f(r * 0.45)}" cy="-${f(r * 0.45)}" rx="${f(r * 0.6)}" ry="${f(r * 0.7)}" fill="${c1}"/><ellipse cx="${f(r * 0.45)}" cy="-${f(r * 0.45)}" rx="${f(r * 0.6)}" ry="${f(r * 0.7)}" fill="${c1}"/>`
        + `<ellipse cx="-${f(r * 0.55)}" cy="${f(r * 0.2)}" rx="${f(r * 0.5)}" ry="${f(r * 0.5)}" fill="${c2}"/><ellipse cx="${f(r * 0.55)}" cy="${f(r * 0.2)}" rx="${f(r * 0.5)}" ry="${f(r * 0.5)}" fill="${c2}"/><ellipse cy="${f(r * 0.45)}" rx="${f(r * 0.6)}" ry="${f(r * 0.55)}" fill="${c2}"/>`
        + `<path d="M0,0 l-${f(r * 0.3)},${f(r * 0.4)} M0,0 l${f(r * 0.3)},${f(r * 0.4)} M0,0 v${f(r * 0.5)}" stroke="#5C4A6E" stroke-width=".7" opacity=".6"/><circle r="${f(r * 0.16)}" fill="#F2D35B"/>`
    case 'spike': // 魯冰花：一根長長的花穗
      return Array.from({ length: 7 }, (_, k) => { const y = r * 1.2 - k * r * 0.48; const w = r * (0.5 - k * 0.045); return `<ellipse cx="-${f(w * 0.6)}" cy="${f(y)}" rx="${f(w * 0.55)}" ry="${f(w * 0.4)}" fill="${k % 2 ? c2 : c1}"/><ellipse cx="${f(w * 0.6)}" cy="${f(y)}" rx="${f(w * 0.55)}" ry="${f(w * 0.4)}" fill="${k % 2 ? c1 : c2}"/>` }).join('')
    case 'calla': // 海芋：白色喇叭捲起來，中間黃色花蕊
      return `<path d="M0,${f(r * 0.9)} C-${f(r * 1.1)},${f(r * 0.2)} -${f(r * 0.9)},-${f(r * 1.2)} ${f(r * 0.2)},-${f(r * 1.3)} C${f(r * 0.9)},-${f(r * 0.9)} ${f(r * 0.8)},${f(r * 0.2)} 0,${f(r * 0.9)}Z" fill="${c1}" stroke="#D8D2C2" stroke-width=".6"/><path d="M0,${f(r * 0.6)} q${f(r * 0.15)},-${f(r * 0.7)} 0,-${f(r * 1.1)}" stroke="${c2}" stroke-width="${f(r * 0.28)}" stroke-linecap="round" fill="none"/>`
    case 'hydrangea': // 繡球花：一顆圓圓的小花球
      return `<circle r="${f(r * 1.05)}" fill="${c2}" opacity=".5"/>` + [[0, 0], [-.55, -.35], [.55, -.35], [-.5, .4], [.5, .4], [0, -.75], [0, .75]].map(([x, y]) => `<g transform="translate(${f(x * r)},${f(y * r)})">${ring(4, r * 0.18, r * 0.17, r * 0.22, c1, 45)}<circle r="${f(r * 0.07)}" fill="#fff" opacity=".8"/></g>`).join('')
    case 'sunflower': // 向日葵：很多黃花瓣、咖啡色大花心
      return ring(14, r * 0.95, r * 0.24, r * 0.55, c1) + `<circle r="${f(r * 0.55)}" fill="${c2}"/><circle r="${f(r * 0.35)}" fill="#6E4630" opacity=".6"/>`
    case 'trumpet': // 牽牛花：喇叭形，中間白色
      return `<circle r="${f(r * 1.0)}" fill="${c1}"/><path d="${[0, 72, 144, 216, 288].map((a) => { const t = (a - 90) * Math.PI / 180; return `M0,0 L${f(Math.cos(t) * r)},${f(Math.sin(t) * r)}` }).join(' ')}" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/><circle r="${f(r * 0.38)}" fill="${c2}"/><circle r="${f(r * 0.14)}" fill="#F2E39A"/>`
    case 'zinnia': // 百日草：兩層花瓣
      return ring(10, r * 0.75, r * 0.3, r * 0.48, c2) + ring(8, r * 0.45, r * 0.26, r * 0.38, c1, 22) + `<circle r="${f(r * 0.3)}" fill="#E0B23E"/><circle r="${f(r * 0.15)}" fill="#8A5A3C"/>`
    case 'lily': // 金針花：六片尖尖的橘色花瓣
      return Array.from({ length: 6 }, (_, k) => `<path d="M0,0 Q-${f(r * 0.35)},-${f(r * 0.6)} 0,-${f(r * 1.2)} Q${f(r * 0.35)},-${f(r * 0.6)} 0,0Z" fill="${k % 2 ? c2 : c1}" transform="rotate(${k * 60})"/>`).join('') + `<circle r="${f(r * 0.18)}" fill="#C46A22"/>`
    case 'cosmos': // 大波斯菊：八片有缺口的花瓣
      return Array.from({ length: 8 }, (_, k) => `<path d="M0,0 L-${f(r * 0.32)},-${f(r * 0.95)} L-${f(r * 0.1)},-${f(r * 0.85)} L0,-${f(r * 1.0)} L${f(r * 0.1)},-${f(r * 0.85)} L${f(r * 0.32)},-${f(r * 0.95)}Z" fill="${c1}" stroke="#D9B9C6" stroke-width=".5" transform="rotate(${k * 45})"/>`).join('') + `<circle r="${f(r * 0.25)}" fill="${c2}"/>`
    case 'mum': // 菊花：很多細細的花瓣，層層疊疊
      return ring(16, r * 0.8, r * 0.13, r * 0.42, c2) + ring(12, r * 0.55, r * 0.13, r * 0.36, c1, 15) + ring(8, r * 0.3, r * 0.12, r * 0.26, c1, 7) + `<circle r="${f(r * 0.16)}" fill="${c2}"/>`
    case 'poinsettia': // 聖誕紅：紅色星形苞片
      return Array.from({ length: 6 }, (_, k) => `<path d="M0,0 Q-${f(r * 0.4)},-${f(r * 0.6)} 0,-${f(r * 1.15)} Q${f(r * 0.4)},-${f(r * 0.6)} 0,0Z" fill="${c1}" transform="rotate(${k * 60 + 30})"/>`).join('') + Array.from({ length: 5 }, (_, k) => `<circle cx="${f(Math.cos(k * 1.26) * r * 0.16)}" cy="${f(Math.sin(k * 1.26) * r * 0.16)}" r="${f(r * 0.1)}" fill="${c2}"/>`).join('')
    default:
      return ring(5, r * 0.85, r * 0.62, r * 0.95, c1) + `<circle r="${f(r * 0.45)}" fill="#F2D35B"/>`
  }
}
