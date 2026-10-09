import { useMemo } from 'react'
import { rng } from './rng.js'

const WIN = ['#22d3ee', '#ff3bd4', '#fbbf24', '#8fb4ff']

function buildLayer(seed, o) {
  const r = rng(seed)
  const out = []
  let x = -40
  while (x < 1640) {
    const w = o.minW + r() * (o.maxW - o.minW)
    const h = o.minH + r() * (o.maxH - o.minH)
    const b = { x, w, h, wins: [], neon: r() < o.neon }
    for (let wy = 900 - h + 16; wy < 890; wy += o.gap) {
      for (let wx = x + 9; wx < x + w - 12; wx += o.gap) {
        if (r() < o.lit) {
          b.wins.push({
            x: wx,
            y: wy,
            c: WIN[Math.floor(r() * WIN.length)],
            blink: r() < 0.14,
            delay: (r() * 5).toFixed(2),
          })
        }
      }
    }
    out.push(b)
    x += w + r() * 10
  }
  return out
}

function Layer({ buildings, color, win }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={900 - b.h} width={b.w} height={b.h} fill={color} />
          {b.neon && (
            <rect className="neon" x={b.x + 10} y={900 - b.h + 34} width={b.w - 20} height="9" rx="4"
              fill={i % 2 ? '#ff3bd4' : '#22d3ee'} />
          )}
          {b.wins.map((w, j) => (
            <rect key={j} className={w.blink ? 'blink' : undefined}
              style={w.blink ? { animationDelay: `${w.delay}s` } : undefined}
              x={w.x} y={w.y} width={win} height={win * 1.3} fill={w.c} opacity="0.85" />
          ))}
        </g>
      ))}
    </svg>
  )
}

// A night city drawn in code: stars, a moon, and three skyline layers that move at different speeds.
export default function City({ root, sky, far, mid, near }) {
  const layers = useMemo(
    () => ({
      far: buildLayer(11, { minW: 50, maxW: 110, minH: 200, maxH: 380, gap: 13, lit: 0.12, neon: 0 }),
      mid: buildLayer(23, { minW: 70, maxW: 130, minH: 280, maxH: 500, gap: 15, lit: 0.22, neon: 0.1 }),
      near: buildLayer(37, { minW: 90, maxW: 170, minH: 380, maxH: 680, gap: 17, lit: 0.3, neon: 0.28 }),
    }),
    []
  )
  const stars = useMemo(() => {
    const r = rng(5)
    return Array.from({ length: 90 }, () => ({
      x: r() * 1600, y: r() * 480, r: 0.6 + r() * 1.3, t: r() < 0.25, d: (r() * 4).toFixed(2),
    }))
  }, [])

  return (
    <div className="city" ref={root} aria-hidden="true">
      <div className="sky" ref={sky}>
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          {stars.map((s, i) => (
            <circle key={i} className={s.t ? 'blink' : undefined}
              style={s.t ? { animationDelay: `${s.d}s` } : undefined}
              cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity="0.8" />
          ))}
          <circle cx="1240" cy="190" r="90" fill="#8fb4ff" opacity="0.12" />
          <circle cx="1240" cy="190" r="56" fill="#eaf1ff" />
          <circle cx="1222" cy="176" r="10" fill="#c9d8f5" opacity="0.7" />
          <circle cx="1258" cy="208" r="7" fill="#c9d8f5" opacity="0.7" />
        </svg>
      </div>
      <div className="layer" ref={far}><Layer buildings={layers.far} color="#141f4a" win={5} /></div>
      <div className="layer" ref={mid}><Layer buildings={layers.mid} color="#0c1438" win={6} /></div>
      <div className="layer" ref={near}><Layer buildings={layers.near} color="#070b1f" win={7} /></div>
    </div>
  )
}
