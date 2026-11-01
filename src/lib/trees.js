// 樹種、果實、季節元素的設定與繪製（產生 SVG 字串片段）

export const SPECIES = {
  guava: {
    id: 'guava', name: '芭樂樹', fruitName: '芭樂', line: '綠色圓圓的芭樂，台灣一年四季都吃得到',
    trunk: '#9A7B63', leaf: 'M0,0 C4,-7 14,-7 19,0 C14,7 4,7 0,0Z', leafScale: 1, spread: 0.5, lenMul: 1, wMul: 1,
    fruit: (x, y) => `<g transform="translate(${x},${y})"><path d="M0,-9 L0,-4" stroke="#7E6A4F" stroke-width="1"/><circle r="5.2" fill="#BFD38A"/><circle r="5.2" fill="url(#fruitShade)"/><path d="M-1.6,4.6 l1.6,1.4 1.6,-1.4" stroke="#7E8A4F" stroke-width=".9" fill="none"/><circle cx="-1.8" cy="-1.8" r="1.4" fill="#fff" opacity=".45"/></g>`
  },
  mango: {
    id: 'mango', name: '芒果樹', fruitName: '芒果', line: '夏天成熟，黃澄澄、香香甜甜',
    trunk: '#8E7058', leaf: 'M0,0 C6,-4 16,-3.5 23,0 C16,3.5 6,4 0,0Z', leafScale: .95, spread: 0.55, lenMul: 1, wMul: 1.15,
    fruit: (x, y) => `<g transform="translate(${x},${y}) rotate(12)"><path d="M0,-10 L0,-5" stroke="#6E5A45" stroke-width="1"/><ellipse rx="4.4" ry="6.4" fill="#F0B64B"/><ellipse cx="1.6" cy="-1.5" rx="2.6" ry="3.6" fill="#E3814E" opacity=".55"/><ellipse rx="4.4" ry="6.4" fill="url(#fruitShade)"/></g>`
  },
  pomelo: {
    id: 'pomelo', name: '柚子樹', fruitName: '柚子', line: '中秋節常常吃，大大的柚子皮還能做帽子',
    trunk: '#93765E', leaf: 'M0,0 L3,0 C6,-7 15,-7 19,0 C15,7 6,7 3,0Z', leafScale: 1, spread: 0.48, lenMul: .95, wMul: 1.05,
    fruit: (x, y) => `<g transform="translate(${x},${y})"><path d="M0,-11 L0,-6" stroke="#6E5A45" stroke-width="1.1"/><path d="M0,-6.5 C5,-6.5 7.5,-1 7,3 C6.4,7 3,8.5 0,8.5 C-3,8.5 -6.4,7 -7,3 C-7.5,-1 -5,-6.5 0,-6.5Z" fill="#E6DE8E"/><path d="M0,-6.5 C5,-6.5 7.5,-1 7,3 C6.4,7 3,8.5 0,8.5 C-3,8.5 -6.4,7 -7,3 C-7.5,-1 -5,-6.5 0,-6.5Z" fill="url(#fruitShade)"/><circle cx="-2.4" cy="-1.8" r="1.6" fill="#fff" opacity=".4"/></g>`
  },
  waxapple: {
    id: 'waxapple', name: '蓮霧樹', fruitName: '蓮霧', line: '像小鈴鐺一樣的紅色果實，咬起來脆脆的',
    trunk: '#8A6D57', leaf: 'M0,0 C5,-5.5 14,-5.5 20,0 C14,5.5 5,5.5 0,0Z', leafScale: 1, spread: 0.62, lenMul: .95, wMul: 1, droop: 0.25,
    fruit: (x, y) => `<g transform="translate(${x},${y})"><path d="M0,-10 L0,-6" stroke="#6E5A45" stroke-width="1"/><path d="M-3.6,-6 C-3.8,-7.6 3.8,-7.6 3.6,-6 L5.6,4.2 C3.4,7 -3.4,7 -5.6,4.2Z" fill="#D45B5B"/><path d="M-5.6,4.2 C-3.4,7 3.4,7 5.6,4.2 L4.6,5.6 C2.5,7.4 -2.5,7.4 -4.6,5.6Z" fill="#9E3F45"/><path d="M-3.6,-6 C-3.8,-7.6 3.8,-7.6 3.6,-6 L5.6,4.2 C3.4,7 -3.4,7 -5.6,4.2Z" fill="url(#fruitShade)"/><path d="M-1.6,-4 L-2.6,2" stroke="#fff" stroke-width="1" opacity=".45" stroke-linecap="round"/></g>`
  },
  sakura: {
    id: 'sakura', name: '山櫻花', fruitName: '櫻花', unit: '朵', verb: '開了', line: '台灣的山櫻花在冬天到春天開，粉紅色一串串',
    trunk: '#6F5546', leaf: 'M0,0 C3,-6 12,-7 17,-2 L20,0 L17,2 C12,7 3,6 0,0Z', leafScale: .95, spread: 0.7, lenMul: 1.05, wMul: .85,
    fruit: (x, y) => {
      let p = ''
      for (let i = 0; i < 5; i++) p += `<ellipse cx="0" cy="-3.4" rx="2.6" ry="3.6" fill="#F1AFC2" transform="rotate(${i * 72})"/>`
      return `<g transform="translate(${x},${y + 4})">${p}<circle r="1.6" fill="#C9506F"/></g>`
    }
  },
  banana: {
    id: 'banana', name: '香蕉樹', fruitName: '香蕉', unit: '串', line: '香蕉其實是很大很大的草，不是真正的樹喔',
    trunk: '#A2A777', leaf: 'M0,0 C6,-5.5 20,-5.5 26,0 C20,5.5 6,5.5 0,0Z', leafScale: .8, structure: 'banana',
    fruit: (x, y) => `<g transform="translate(${x},${y})"><path d="M0,-9 L0,-4" stroke="#7E8A4F" stroke-width="1.2"/>${[-4, 0, 4].map((dx, i) => `<path d="M${dx},-4 C${dx - 3},0 ${dx - 2},6 ${dx + 2},8 C${dx + 0.5},4 ${dx + 0.5},0 ${dx + 1.6},-4Z" fill="${i === 1 ? '#F2D35B' : '#E9C850'}" stroke="#B89A3A" stroke-width=".5"/>`).join('')}</g>`
  }
}
export const SPECIES_LIST = ['guava', 'mango', 'pomelo', 'waxapple', 'sakura', 'banana'].map((k) => SPECIES[k])

/* ---------- 每月的花與小動物（台灣） ---------- */
export const SEASONS = {
  1: { flower: 'plum', animal: 'whiteeye', text: '梅花開了，綠繡眼來找花蜜' },
  2: { flower: 'sakura', animal: 'whiteeye', text: '山櫻花盛開，綠繡眼在枝頭跳來跳去' },
  3: { flower: 'azalea', animal: 'butterfly', text: '杜鵑花開滿地，蝴蝶飛來了' },
  4: { flower: 'tung', animal: 'butterfly', text: '油桐花像下雪一樣飄落' },
  5: { flower: 'tung', animal: 'firefly', text: '晚上的草叢裡，螢火蟲一閃一閃' },
  6: { flower: 'wild', animal: 'snail', text: '梅雨季，蝸牛慢慢爬出來散步' },
  7: { flower: 'flame', animal: 'cicada', text: '鳳凰花開，樹上的蟬唧唧叫' },
  8: { flower: 'flame', animal: 'dragonfly', text: '夏天的午後，蜻蜓在草地上飛' },
  9: { flower: 'goldenrain', animal: 'redfly', text: '台灣欒樹開黃花，紅蜻蜓來了' },
  10: { flower: 'goldenrain_red', animal: 'squirrel', text: '欒樹的果實變紅了，松鼠忙著找食物' },
  11: { flower: 'fallen', animal: 'sparrow', text: '樹下有落葉，小麻雀來散步' },
  12: { flower: 'maple', animal: 'sparrow', text: '楓葉紅了，小麻雀躲在樹下取暖' }
}

const petals = (n, r, color, rx = 2.4, ry = 3.2) =>
  Array.from({ length: n }, (_, i) => `<ellipse cy="${-r}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${(360 / n) * i})"/>`).join('')

// 地面上的花（x,y 為地面位置）
export function groundFlower(type, x, y, rnd) {
  const s = (0.8 + rnd * 0.4).toFixed(2)
  const stem = `<path d="M0,0 q${(rnd * 4 - 2).toFixed(1)},-5 0,-10" stroke="#83A48A" stroke-width="1.1" fill="none"/>`
  const head = (inner) => `<g transform="translate(${x},${y}) scale(${s})">${stem}<g transform="translate(0,-11)">${inner}</g></g>`
  switch (type) {
    case 'plum': return head(petals(5, 2.6, '#FBF3F0') + '<circle r="1.3" fill="#D6B65E"/>')
    case 'sakura': return head(petals(5, 2.6, '#F1AFC2') + '<circle r="1.2" fill="#C9506F"/>')
    case 'azalea': return head(petals(5, 3, '#D9709A', 2.6, 3.6) + '<circle r="1.2" fill="#9E3F65"/>')
    case 'tung': return head(petals(5, 2.6, '#FFFFFF') + '<circle r="1.4" fill="#D9707A"/>')
    case 'wild': return head(petals(6, 2.2, '#EDE7F2', 1.8, 2.6) + '<circle r="1.1" fill="#D6B65E"/>')
    case 'flame': return head(petals(5, 2.8, '#E2623F') + '<circle r="1.2" fill="#F2C14E"/>')
    case 'goldenrain': return head('<circle r="2" fill="#E9C84A"/><circle cx="3" cy="2" r="1.7" fill="#F0D45F"/><circle cx="-3" cy="1.5" r="1.6" fill="#E9C84A"/>')
    case 'goldenrain_red': return head('<path d="M0,-3 L3,1 L0,4 L-3,1Z" fill="#C8644F"/><path d="M4,0 L6.5,3 L4,5.5 L1.8,3Z" fill="#B85A4A"/>')
    case 'fallen': return `<path transform="translate(${x},${y}) rotate(${Math.round(rnd * 360)}) scale(${s})" d="M0,0 C3,-4 9,-4 11,0 C9,4 3,4 0,0Z" fill="${rnd > 0.5 ? '#C99A5B' : '#B5734A'}" opacity=".85"/>`
    case 'maple': return `<g transform="translate(${x},${y - 2}) rotate(${Math.round(rnd * 60 - 30)}) scale(${(s * 0.9).toFixed(2)})"><path d="M0,-6 L1.5,-2 L5,-3.5 L3,0 L6,2 L1.8,2 L1,5 L0,2.6 L-1,5 L-1.8,2 L-6,2 L-3,0 L-5,-3.5 L-1.5,-2Z" fill="#C8513F"/></g>`
    default: return ''
  }
}

// 小動物（座標由繪製函式依樹的大小決定）
export function animal(type, ctx) {
  const { trunkX, groundY, canopy } = ctx
  switch (type) {
    case 'whiteeye': {
      const [x, y] = canopy
      return `<g class="sf-hop" transform="translate(${x},${y})"><ellipse rx="7" ry="5" fill="#A7B65A"/><circle cx="5.5" cy="-3" r="3.6" fill="#B4C266"/><circle cx="6.4" cy="-3.4" r="1.7" fill="#fff"/><circle cx="6.6" cy="-3.4" r=".9" fill="#3E3832"/><path d="M9,-3 l3,.6 -3,.8Z" fill="#5C5146"/><path d="M-6,0 l-5,2 4,1Z" fill="#8E9C48"/><ellipse cx="0" cy="2.4" rx="4.5" ry="2" fill="#E9E2B8"/></g>`
    }
    case 'sparrow': {
      return `<g class="sf-hop" transform="translate(${trunkX + 42},${groundY - 6})"><ellipse rx="7" ry="5" fill="#A0785A"/><circle cx="5.6" cy="-3.2" r="3.6" fill="#8B5E45"/><circle cx="5.6" cy="-2" r="2.4" fill="#F1E6D2"/><circle cx="6.6" cy="-3.8" r=".9" fill="#3E3832"/><path d="M9,-3.2 l2.6,.6 -2.6,.8Z" fill="#5C5146"/><path d="M-6,-1 l-5,1 4,2Z" fill="#6E4C38"/><path d="M-1,5 l-1,3 M2,5 l1,3" stroke="#5C5146" stroke-width=".8"/></g>`
    }
    case 'butterfly': {
      const [x, y] = canopy
      return `<g transform="translate(${x + 26},${y - 18})"><g class="sf-flap"><ellipse cx="-4" cy="-3" rx="4.5" ry="5.5" fill="#E9B84E" transform="rotate(-20)"/><ellipse cx="4" cy="-3" rx="4.5" ry="5.5" fill="#E9B84E" transform="rotate(20)"/><ellipse cx="-3" cy="3" rx="3" ry="3.4" fill="#D98E4A"/><ellipse cx="3" cy="3" rx="3" ry="3.4" fill="#D98E4A"/></g><rect x="-.8" y="-5" width="1.6" height="10" rx=".8" fill="#5C5146"/></g>`
    }
    case 'firefly': {
      let s = ''
      const pts = [[-70, -40], [60, -60], [-40, -90], [85, -20], [20, -110]]
      pts.forEach(([dx, dy], i) => { s += `<circle class="sf-blink" style="animation-delay:${i * 0.5}s" cx="${trunkX + dx}" cy="${groundY + dy}" r="3" fill="#F3E58A"/><circle cx="${trunkX + dx}" cy="${groundY + dy}" r="1.2" fill="#FFF9D0"/>` })
      return s
    }
    case 'snail': {
      return `<g transform="translate(${trunkX - 54},${groundY - 4})"><path d="M-8,4 C-8,0 6,0 12,4Z" fill="#C9B79A"/><circle cx="0" cy="-2" r="6" fill="#B98A5E"/><path d="M0,-2 m-3,0 a3,3 0 1,1 3,3 a1.6,1.6 0 1,1 -1.6,-1.6" stroke="#8E6440" stroke-width="1" fill="none"/><path d="M10,2 l2,-6 M12,3 l3,-5" stroke="#B5A486" stroke-width="1"/></g>`
    }
    case 'cicada': {
      return `<g transform="translate(${trunkX + 4},${groundY - 48}) rotate(-90)"><ellipse rx="6" ry="3" fill="#5E5A3E"/><path d="M-2,-2 C4,-10 12,-8 14,-4 C10,-3 4,-2 -2,-1Z" fill="#DDE3D8" opacity=".75"/><path d="M-2,2 C4,10 12,8 14,4 C10,3 4,2 -2,1Z" fill="#DDE3D8" opacity=".75"/><circle cx="-5" cy="-2" r="1" fill="#2F2A25"/><circle cx="-5" cy="2" r="1" fill="#2F2A25"/></g>`
    }
    case 'dragonfly':
    case 'redfly': {
      const [x, y] = canopy
      const body = type === 'redfly' ? '#C8513F' : '#5E8CA3'
      return `<g class="sf-float" transform="translate(${x - 30},${y - 20})"><rect x="-1" y="-2" width="22" height="2.6" rx="1.3" fill="${body}"/><circle cx="-1" cy="-.7" r="2.4" fill="${body}"/><g opacity=".6" fill="#E6EEF2"><ellipse cx="6" cy="-6" rx="7" ry="2.4" transform="rotate(-12 6 -6)"/><ellipse cx="6" cy="5" rx="7" ry="2.4" transform="rotate(12 6 5)"/><ellipse cx="3" cy="-5" rx="6" ry="2" transform="rotate(-30 3 -5)"/><ellipse cx="3" cy="4" rx="6" ry="2" transform="rotate(30 3 4)"/></g></g>`
    }
    case 'squirrel': {
      return `<g transform="translate(${trunkX + 48},${groundY - 8})"><path d="M-6,4 C-14,2 -16,-12 -8,-16 C-4,-18 -2,-12 -6,-8 C-10,-4 -8,0 -4,2Z" fill="#B07A52"/><ellipse cx="2" cy="0" rx="6" ry="6.5" fill="#A0704C"/><circle cx="6" cy="-6" r="4" fill="#A0704C"/><path d="M5,-10 l1,-3 2,3Z" fill="#8B5E45"/><circle cx="7.6" cy="-6.6" r=".9" fill="#2F2A25"/><ellipse cx="4" cy="1" rx="2.4" ry="3.6" fill="#E8D3B6"/><circle cx="8" cy="0" r="2" fill="#7E5A3A"/></g>`
    }
    default: return ''
  }
}
