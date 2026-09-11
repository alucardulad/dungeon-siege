/**
 * 教学老师的头像立绘：用内联 SVG 画一个半身像，男女老师各一套配色。
 *
 * 放在 DOM 面板里，所以浏览器预览和 Cocos Web 构建共用同一份，
 * 不用给两个引擎各画一遍。
 */

export function teacherPortraitSvg(gender: 'male' | 'female'): string {
  const skin = '#ffd7ad'
  const skinShadow = '#e6b98e'
  const ink = '#2b2b33'
  const blush = '#f7b7a3'
  const hair = gender === 'female' ? '#5a3a2a' : '#33241f'
  const robe = gender === 'female' ? '#7b7fdb' : '#4b9a86'
  const robeDark = gender === 'female' ? '#666bc2' : '#397a68'
  const accent = gender === 'female' ? '#f2798f' : '#ffd166'
  const bg = '#141a29'
  const ring = '#3b4868'

  const sideHair =
    gender === 'female'
      ? `
    <rect x="34" y="28" width="9" height="58" rx="4.5" fill="${hair}"/>
    <rect x="77" y="28" width="9" height="58" rx="4.5" fill="${hair}"/>`
      : ''

  const topHair =
    gender === 'female'
      ? `
    <rect x="36" y="20" width="48" height="24" rx="12" fill="${hair}"/>
    <circle cx="60" cy="18" r="8" fill="${hair}"/>`
      : `
    <rect x="38" y="24" width="44" height="20" rx="12" fill="${hair}"/>`

  const hairBand =
    gender === 'female'
      ? `<rect x="36" y="42" width="48" height="5" rx="2.5" fill="${accent}"/>`
      : ''

  const collar =
    gender === 'female'
      ? `<path d="M50 92 L60 102 L70 92 L60 98 Z" fill="${robeDark}"/>`
      : `<rect x="50" y="90" width="20" height="5" rx="2.5" fill="${accent}"/>`

  return `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${gender === 'female' ? '女老师' : '男老师'}">
  <circle cx="60" cy="64" r="58" fill="${ring}"/>
  <circle cx="60" cy="64" r="54" fill="${bg}"/>
  <path d="M26 130 C26 102 40 88 60 88 C80 88 94 102 94 130 Z" fill="${robe}"/>
  ${collar}
  <rect x="52" y="70" width="16" height="14" rx="7" fill="${skinShadow}"/>
  ${sideHair}
  <rect x="38" y="30" width="44" height="50" rx="16" fill="${skin}"/>
  ${topHair}
  ${hairBand}
  <circle cx="51" cy="56" r="2.6" fill="${ink}"/>
  <circle cx="69" cy="56" r="2.6" fill="${ink}"/>
  <circle cx="52" cy="55.2" r="0.9" fill="#ffffff"/>
  <circle cx="70" cy="55.2" r="0.9" fill="#ffffff"/>
  <path d="M53 64 Q60 69 67 64" stroke="#c96f5a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <circle cx="46" cy="62" r="3" fill="${blush}" opacity="0.8"/>
  <circle cx="74" cy="62" r="3" fill="${blush}" opacity="0.8"/>
</svg>`
}
