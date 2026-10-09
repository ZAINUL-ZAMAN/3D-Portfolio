// Small animated illustrations that sit beside the text. All drawn in code and animated with CSS.

export function EditorArt() {
  return (
    <svg className="art-svg" viewBox="0 0 400 240" role="img" aria-label="Animated video editor with a moving timeline">
      <defs>
        <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b2a6b" />
          <stop offset="1" stopColor="#6a2a8f" />
        </linearGradient>
        <clipPath id="tl"><rect x="32" y="136" width="336" height="64" rx="4" /></clipPath>
      </defs>
      <rect x="16" y="8" width="368" height="206" rx="14" fill="#0a1228" stroke="#22d3ee" strokeOpacity=".6" strokeWidth="2" />
      <rect x="32" y="22" width="336" height="106" rx="8" fill="url(#pv)" />
      <circle className="a-sun" cx="110" cy="70" r="20" fill="#fbbf24" />
      <path d="M32 128 L120 84 L190 112 L260 70 L368 128 Z" fill="#0b1430" opacity=".85" />
      <g className="a-play">
        <circle cx="200" cy="75" r="22" fill="#fff" fillOpacity=".92" />
        <path d="M193 63 L193 87 L212 75 Z" fill="#0a1228" />
      </g>
      <g clipPath="url(#tl)">
        <rect x="32" y="136" width="336" height="64" fill="#0f1b3a" />
        <g className="a-clips1">
          <rect x="40" y="142" width="90" height="16" rx="3" fill="#22d3ee" />
          <rect x="136" y="142" width="60" height="16" rx="3" fill="#8b5cf6" />
          <rect x="202" y="142" width="110" height="16" rx="3" fill="#22d3ee" />
          <rect x="320" y="142" width="90" height="16" rx="3" fill="#8b5cf6" />
        </g>
        <g className="a-clips2">
          <rect x="60" y="162" width="70" height="16" rx="3" fill="#ff3bd4" />
          <rect x="150" y="162" width="120" height="16" rx="3" fill="#fbbf24" />
          <rect x="290" y="162" width="80" height="16" rx="3" fill="#ff3bd4" />
        </g>
        <g className="a-clips3">
          <rect x="40" y="182" width="140" height="12" rx="3" fill="#a3e635" />
          <rect x="190" y="182" width="90" height="12" rx="3" fill="#ff6b4a" />
          <rect x="290" y="182" width="100" height="12" rx="3" fill="#a3e635" />
        </g>
      </g>
      <g className="a-playhead">
        <rect x="52" y="132" width="2.5" height="72" fill="#fff" />
        <path d="M47 128 h13 l-6.5 9 z" fill="#fff" />
      </g>
    </svg>
  )
}

const INNER = ['React', 'Next.js', 'TypeScript']
const OUTER = ['Tailwind', 'Supabase', 'FFmpeg']

export function OrbitArt() {
  return (
    <div className="orbit" role="img" aria-label="The tools I use, orbiting around code">
      <div className="core">&lt;/&gt;</div>
      <div className="ring r1">
        {INNER.map((c, i) => (
          <div className="slot" key={c} style={{ '--a': `${i * 120}deg` }}>
            <div className="counter"><span className="chip">{c}</span></div>
          </div>
        ))}
      </div>
      <div className="ring r2">
        {OUTER.map((c, i) => (
          <div className="slot" key={c} style={{ '--a': `${60 + i * 120}deg` }}>
            <div className="counter"><span className="chip">{c}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PaletteArt() {
  return (
    <svg className="art-svg" viewBox="0 0 400 240" role="img" aria-label="Three color circles that blend and drift">
      <g style={{ mixBlendMode: 'screen' }}>
        <circle className="a-blob b1" cx="150" cy="100" r="70" fill="#22d3ee" opacity=".8" />
        <circle className="a-blob b2" cx="230" cy="100" r="70" fill="#ff3bd4" opacity=".8" />
        <circle className="a-blob b3" cx="190" cy="160" r="70" fill="#fbbf24" opacity=".8" />
      </g>
      <g>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} className="a-bar" style={{ animationDelay: `${i * 0.25}s` }}
            x={110 + i * 50} y="218" width="30" height="8" rx="4" fill={['#22d3ee', '#ff3bd4', '#fbbf24', '#a3e635'][i]} />
        ))}
      </g>
    </svg>
  )
}

export function PlaneArt() {
  const path = 'M20 220 C 120 40, 220 260, 380 50'
  return (
    <svg className="art-svg" viewBox="0 0 400 260" role="img" aria-label="A paper plane flying along a dotted path">
      <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="6 9" className="a-trail" />
      <g className="a-cloud c1" fill="#8fb4ff" opacity=".35">
        <circle cx="90" cy="60" r="14" /><circle cx="108" cy="64" r="10" />
      </g>
      <g className="a-cloud c2" fill="#ff3bd4" opacity=".3">
        <circle cx="300" cy="190" r="16" /><circle cx="320" cy="196" r="11" />
      </g>
      <g>
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={path} />
        <path d="M-18 -12 L18 0 L-18 12 L-10 0 Z" fill="#fff" />
        <path d="M-10 0 L18 0 L-18 12 Z" fill="#9fd8ff" />
      </g>
    </svg>
  )
}
