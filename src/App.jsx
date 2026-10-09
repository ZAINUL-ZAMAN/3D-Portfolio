import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MathUtils, MeshBasicMaterial, MeshStandardMaterial, Vector3, DoubleSide } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import heroImg from './assets/hero.jpg'
import City from './City.jsx'
import { EditorArt, OrbitArt, PaletteArt, PlaneArt } from './Art.jsx'
import { rng } from './rng.js'
import { enableSound, disableSound, swoosh, boing } from './sound.js'

gsap.registerPlugin(ScrollTrigger)

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const HOODIES = [
  { id: '#2a4a8f', label: 'Midnight' },
  { id: '#9b1f3a', label: 'Crimson' },
  { id: '#1f7a55', label: 'Forest' },
  { id: '#5b3bbd', label: 'Violet' },
]
const GLOWS = [
  { id: '#22d3ee', label: 'Cyan' },
  { id: '#ff3bd4', label: 'Magenta' },
  { id: '#a3e635', label: 'Lime' },
  { id: '#fbbf24', label: 'Amber' },
]

const smooth = (a, b, x) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/* ---------- flying shapes: circles, rings, strips, triangles, squares, plus signs ---------- */
const PALETTE = ['#22d3ee', '#ff3bd4', '#fbbf24', '#a3e635', '#8b5cf6', '#ff6b4a']
const KINDS = ['circle', 'ring', 'strip', 'strip', 'tri', 'square', 'plus']

function makeFlyers() {
  const r = rng(77)
  return Array.from({ length: 26 }, (_, i) => ({
    id: i,
    kind: KINDS[Math.floor(r() * KINDS.length)],
    color: PALETTE[Math.floor(r() * PALETTE.length)],
    size: 14 + r() * 44,
    x0: r(),
    y0: r() * 2000,
    sp: (r() < 0.3 ? -1 : 1) * (0.35 + r() * 1.4),
    rot: r() * 360,
    rs: (r() - 0.5) * 0.25,
    amp: 20 + r() * 90,
    ph: r() * 6.28,
    op: 0.4 + r() * 0.4,
  }))
}

/* ---------- the kid: a small 3D character with pivots at shoulders and hips ---------- */
function Kid({ hoodie, glow }) {
  const { camera, size } = useThree()
  const root = useRef(), inner = useRef(), head = useRef()
  const armL = useRef(), armR = useRef(), legL = useRef(), legR = useRef()
  const st = useRef({ x: 0, px: 0, v: 0, rot: 0.35, phase: 0, j: -1, spin: false, dist: 0, lastY: 0, appear: 0 })

  const m = useMemo(
    () => ({
      hood: new MeshStandardMaterial({ roughness: 0.8, emissiveIntensity: 0.5 }),
      dark: new MeshStandardMaterial({ color: '#16213f', emissive: '#12285a', emissiveIntensity: 0.8, roughness: 0.7 }),
      skin: new MeshStandardMaterial({ color: '#f0bf9f', emissive: '#a8693f', emissiveIntensity: 0.45, roughness: 0.6 }),
      white: new MeshBasicMaterial({ color: '#ffffff' }),
      ink: new MeshBasicMaterial({ color: '#0b1020' }),
      glow: new MeshBasicMaterial(),
      ring: new MeshBasicMaterial({ transparent: true, opacity: 0.5, side: DoubleSide }),
    }),
    []
  )

  // Live preview: recolor the kid whenever the visitor picks something.
  useEffect(() => {
    m.hood.color.set(hoodie)
    m.hood.emissive.set(hoodie)
    m.glow.color.set(glow)
    m.ring.color.set(glow)
  }, [hoodie, glow, m])

  // Click or tap the kid to make him jump and flip.
  useEffect(() => {
    const hit = (e) => {
      const g = root.current
      if (!g || !g.visible) return false
      const s = g.scale.x
      const v = new Vector3(g.position.x, g.position.y + 1.2 * s, 0).project(camera)
      const cx = (v.x * 0.5 + 0.5) * size.width
      const cy = (-v.y * 0.5 + 0.5) * size.height
      const ppu = size.height / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z)
      return Math.abs(e.clientX - cx) < 0.75 * ppu * s && Math.abs(e.clientY - cy) < 1.35 * ppu * s
    }
    const down = (e) => {
      if (e.target.closest && e.target.closest('a,button')) return
      const s = st.current
      if (hit(e) && s.j < 0) {
        s.j = 0
        s.spin = true
        boing()
      }
    }
    const move = (e) => {
      document.body.style.cursor = hit(e) ? 'pointer' : ''
    }
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    return () => {
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      document.body.style.cursor = ''
    }
  }, [camera, size])

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.05)
    const t = state.clock.elapsedTime
    const s = st.current
    const vh = window.innerHeight
    const y = window.scrollY

    const dy = y - s.lastY
    s.lastY = y
    s.dist += Math.abs(dy)

    // The kid shows up after the city and room scenes, then roams left and right as you scroll.
    const visible = y > vh * 1.7
    if (!visible) s.dist = 0
    s.appear = MathUtils.damp(s.appear, visible ? 1 : 0, 5, d)
    const narrow = MathUtils.clamp(size.width / 1000, 0.4, 1)
    const tx = Math.sin((y / (vh * 0.8)) * Math.PI) * 2.8 * narrow
    s.x = MathUtils.damp(s.x, tx, 4, d)
    const vel = (s.x - s.px) / Math.max(d, 1e-3)
    s.px = s.x
    s.v = MathUtils.damp(s.v, vel, 10, d)
    const walk = MathUtils.clamp(Math.abs(s.v) / 0.9, 0, 1)

    s.rot = MathUtils.damp(s.rot, walk > 0.15 ? Math.sign(s.v) * 1.0 : 0.35, 6, d)
    s.phase += d * walk * 10
    const swing = Math.sin(s.phase) * 0.85 * walk

    let legLx = swing, legRx = -swing
    let armLx = -swing * 0.9, armRx = swing * 0.9
    let armLz = -0.12, armRz = 0.12
    let bob = Math.abs(Math.sin(s.phase)) * 0.08 * walk + Math.abs(Math.sin(t * 3)) * 0.025 * (1 - walk)
    let spin = 0

    // He hops by himself every so often while you scroll, and flips when you click him.
    if (visible && s.j < 0 && s.dist > vh * 0.6 && !reduceMotion) {
      s.j = 0
      s.dist = 0
      boing()
    }
    if (s.j >= 0) {
      s.j += d
      const k = s.j / 0.72
      if (k >= 1) {
        s.j = -1
        s.spin = false
      } else {
        const air = Math.sin(Math.PI * k)
        bob += air * 1.15
        armLz = -2.6 * air - 0.12 * (1 - air)
        armRz = 2.6 * air + 0.12 * (1 - air)
        armLx = armRx = 0
        legLx = -0.7 * air
        legRx = -0.45 * air
        if (s.spin) spin = k * k * (3 - 2 * k) * Math.PI * 2
      }
    }

    legL.current.rotation.x = legLx
    legR.current.rotation.x = legRx
    armL.current.rotation.x = armLx
    armR.current.rotation.x = armRx
    armL.current.rotation.z = armLz
    armR.current.rotation.z = armRz
    head.current.rotation.z = Math.sin(t * 1.6) * 0.05
    inner.current.rotation.y = spin

    const scale = 0.62 * MathUtils.clamp(size.width / 700, 0.7, 1) * s.appear
    root.current.scale.setScalar(Math.max(scale, 0.0001))
    root.current.position.set(s.x, -2.5 + bob * (scale / 0.62), 0)
    root.current.rotation.y = s.rot
    root.current.visible = s.appear > 0.02
  })

  return (
    <group ref={root}>
      <pointLight color={glow} intensity={5} distance={9} position={[1.2, 1.4, 1.8]} />
      <pointLight color="#2f6bff" intensity={4} distance={9} position={[-1.6, 1, -1.4]} />
      <group ref={inner}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} material={m.ring}>
          <ringGeometry args={[0.45, 0.62, 36]} />
        </mesh>

        {/* body */}
        <mesh position={[0, 0.83, 0]} scale={[1.1, 1, 0.8]} material={m.hood}>
          <capsuleGeometry args={[0.27, 0.28, 8, 16]} />
        </mesh>
        <mesh position={[0, 0.8, 0.22]} material={m.glow}>
          <boxGeometry args={[0.03, 0.4, 0.01]} />
        </mesh>

        {/* head */}
        <group ref={head} position={[0, 1.62, 0]}>
          <mesh material={m.skin}>
            <sphereGeometry args={[0.5, 28, 28]} />
          </mesh>
          <mesh position={[0, 0.04, -0.04]} material={m.dark}>
            <sphereGeometry args={[0.53, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          </mesh>
          {[[-0.36, 0.42, 0.7], [-0.18, 0.5, 0.25], [0, 0.54, 0], [0.18, 0.5, -0.25], [0.36, 0.42, -0.7]].map(([x, yy, rz], i) => (
            <mesh key={i} position={[x, yy, 0.02]} rotation={[0, 0, rz]} material={m.dark}>
              <coneGeometry args={[0.1, 0.3, 6]} />
            </mesh>
          ))}
          {[-0.18, 0.18].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.02, 0.43]} scale={[1, 1.15, 0.5]} material={m.white}>
                <sphereGeometry args={[0.1, 14, 14]} />
              </mesh>
              <mesh position={[x, 0.02, 0.47]} material={m.ink}>
                <sphereGeometry args={[0.055, 12, 12]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, -0.13, 0.46]} rotation={[0, 0, Math.PI]} material={m.ink}>
            <torusGeometry args={[0.1, 0.02, 8, 16, Math.PI]} />
          </mesh>
          {[-0.28, 0.28].map((x) => (
            <mesh key={x} position={[x, -0.1, 0.42]} material={new MeshBasicMaterial({ color: '#ff8aa0', transparent: true, opacity: 0.45 })}>
              <sphereGeometry args={[0.06, 10, 10]} />
            </mesh>
          ))}
          {/* headphones */}
          <mesh position={[0, 0, 0]} material={m.dark}>
            <torusGeometry args={[0.56, 0.04, 8, 32, Math.PI]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.54, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={m.dark}>
                <cylinderGeometry args={[0.16, 0.16, 0.1, 20]} />
              </mesh>
              <mesh position={[sx * 0.055, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glow}>
                <torusGeometry args={[0.1, 0.018, 8, 24]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* arms */}
        {[{ side: 1, ref: armR }, { side: -1, ref: armL }].map(({ side, ref }) => (
          <group key={side} ref={ref} position={[side * 0.4, 1.02, 0]}>
            <mesh position={[0, -0.2, 0]} material={m.hood}>
              <capsuleGeometry args={[0.085, 0.26, 6, 12]} />
            </mesh>
            <mesh position={[0, -0.46, 0]} material={m.skin}>
              <sphereGeometry args={[0.09, 12, 12]} />
            </mesh>
          </group>
        ))}

        {/* legs */}
        {[{ side: 1, ref: legR }, { side: -1, ref: legL }].map(({ side, ref }) => (
          <group key={side} ref={ref} position={[side * 0.15, 0.5, 0]}>
            <mesh position={[0, -0.2, 0]} material={m.dark}>
              <capsuleGeometry args={[0.095, 0.3, 6, 12]} />
            </mesh>
            <mesh position={[0, -0.45, 0.05]} material={m.dark}>
              <boxGeometry args={[0.2, 0.12, 0.34]} />
            </mesh>
            <mesh position={[0, -0.5, 0.05]} material={m.glow}>
              <boxGeometry args={[0.21, 0.025, 0.35]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

function Scene({ hoodie, glow }) {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 1.75]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} color="#8fb4ff" intensity={1.4} />
      <Kid hoodie={hoodie} glow={glow} />
    </Canvas>
  )
}

function Choice({ options, value, onChange, label }) {
  return (
    <div className="choice" role="group" aria-label={label}>
      <span className="choice-label">{label}</span>
      <div className="choice-row">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={value === o.id ? 'swatch on' : 'swatch'}
            style={{ background: o.id }}
            aria-label={o.label}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          />
        ))}
      </div>
    </div>
  )
}

const STREAKS = [
  { top: 14, h: 3, c: '#22d3ee' },
  { top: 27, h: 6, c: '#ff3bd4' },
  { top: 41, h: 3, c: '#fbbf24' },
  { top: 56, h: 5, c: '#a3e635' },
  { top: 70, h: 3, c: '#8b5cf6' },
  { top: 84, h: 6, c: '#22d3ee' },
]

export default function App() {
  const [hoodie, setHoodie] = useState(HOODIES[0].id)
  const [glow, setGlow] = useState(GLOWS[0].id)
  const [sound, setSound] = useState(false)
  const flyers = useMemo(makeFlyers, [])

  const bar = useRef(), veil = useRef(), roomEl = useRef(), heroCopy = useRef()
  const cityRoot = useRef(), sky = useRef(), far = useRef(), mid = useRef(), near = useRef()
  const flyEls = useRef([])
  const streakEls = useRef([])
  const soundRef = useRef(false)

  const toggleSound = () => {
    if (soundRef.current) {
      disableSound()
      soundRef.current = false
      setSound(false)
    } else if (enableSound()) {
      soundRef.current = true
      setSound(true)
      swoosh(0.7, 1)
    }
  }

  useEffect(() => {
    const vh = () => window.innerHeight

    // Scene transitions: city -> man at his computer -> dark background for the text.
    const apply = (y) => {
      const p = y / vh()
      if (cityRoot.current) {
        cityRoot.current.style.opacity = String(1 - smooth(0.7, 1.5, p))
        far.current.style.transform = `translate3d(0,${p * vh() * 0.05}px,0) scale(${1 + p * 0.04})`
        mid.current.style.transform = `translate3d(0,${p * vh() * 0.12}px,0) scale(${1 + p * 0.09})`
        near.current.style.transform = `translate3d(0,${p * vh() * 0.24}px,0) scale(${1 + p * 0.18})`
        sky.current.style.transform = `translate3d(0,${p * vh() * 0.02}px,0)`
      }
      if (heroCopy.current) {
        heroCopy.current.style.opacity = String(1 - smooth(0, 0.55, p))
        heroCopy.current.style.transform = `translate3d(0,${-p * 70}px,0)`
      }
      if (roomEl.current) {
        const tt = smooth(0.45, 1.45, p)
        roomEl.current.style.opacity = String(tt * (1 - 0.9 * smooth(1.9, 2.7, p)))
        roomEl.current.style.transform = `translate3d(${(1 - tt) * 32}%,0,0) scale(${1.14 - 0.14 * tt})`
      }
      if (veil.current) veil.current.style.opacity = String(smooth(1.9, 2.7, p) * 0.94)
    }

    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
        apply(window.scrollY)
      },
    })
    apply(window.scrollY)

    // Flying shapes: parallax movement, with a stretch when you scroll fast.
    let raf = 0
    let sm = window.scrollY
    let velocity = 0
    let lastSwoosh = 0
    const tick = (now) => {
      const target = window.scrollY
      const prev = sm
      sm += (target - sm) * 0.12
      velocity += ((sm - prev) - velocity) * 0.2
      const W = window.innerWidth
      const H = window.innerHeight
      const loop = H + 400
      const stretch = 1 + Math.min(Math.abs(velocity) * 0.05, 3)
      flyers.forEach((f, i) => {
        const el = flyEls.current[i]
        if (!el) return
        let yy = (f.y0 - sm * f.sp) % loop
        if (yy < 0) yy += loop
        yy -= 200
        const xx = f.x0 * W + (reduceMotion ? 0 : Math.sin(sm / 400 + f.ph) * f.amp)
        const sy = f.kind === 'strip' || f.kind === 'circle' ? stretch : 1 + (stretch - 1) * 0.25
        el.style.transform = `translate3d(${xx}px,${yy}px,0) rotate(${f.rot + sm * f.rs}deg) scaleY(${sy})`
      })
      if (soundRef.current && Math.abs(velocity) > 14 && now - lastSwoosh > 650) {
        swoosh(Math.min(1, Math.abs(velocity) / 50), velocity > 0 ? 1 : -1)
        lastSwoosh = now
      }
      raf = requestAnimationFrame(tick)
    }
    if (!reduceMotion) raf = requestAnimationFrame(tick)
    else tick(0)

    const ctx = gsap.context(() => {
      if (!reduceMotion) {
        gsap.from('.hero-line', { yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.2 })
        gsap.from('.hero-fade', { opacity: 0, y: 16, duration: 1, delay: 0.9, stagger: 0.15 })
      }

      // A bundle of colored strips zips across the screen each time a new scene arrives.
      const fire = (dir) => {
        if (reduceMotion) return
        gsap.fromTo(
          streakEls.current,
          { xPercent: dir > 0 ? -130 : 130, opacity: 1 },
          { xPercent: dir > 0 ? 130 : -130, duration: 0.75, ease: 'power3.in', stagger: 0.05, overwrite: true,
            onComplete: () => gsap.set(streakEls.current, { opacity: 0 }) }
        )
        swoosh(0.8, dir)
      }
      gsap.utils.toArray('.panel.scene').forEach((panel) => {
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 65%',
          onEnter: () => fire(1),
          onEnterBack: () => fire(-1),
        })
      })

      if (reduceMotion) return
      gsap.utils.toArray('.panel.reveal').forEach((panel) => {
        const flip = panel.classList.contains('flip')
        gsap.from(panel.querySelector('.copy'), {
          opacity: 0, x: flip ? 60 : -60, ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top 80%', end: 'top 35%', scrub: true },
        })
        const art = panel.querySelector('.art')
        if (art) {
          gsap.from(art, {
            opacity: 0, scale: 0.6, rotate: flip ? -10 : 10, x: flip ? -80 : 80, ease: 'none',
            scrollTrigger: { trigger: panel, start: 'top 85%', end: 'top 30%', scrub: true },
          })
        }
      })
    })

    return () => {
      st.kill()
      cancelAnimationFrame(raf)
      ctx.revert()
    }
  }, [flyers])

  return (
    <>
      <div className="progress" aria-hidden="true"><div className="progress-bar" ref={bar} /></div>

      <button type="button" className={sound ? 'sound on' : 'sound'} onClick={toggleSound} aria-pressed={sound}>
        {sound ? 'Sound on' : 'Sound off'}
      </button>

      <City root={cityRoot} sky={sky} far={far} mid={mid} near={near} />
      <div className="room" ref={roomEl} style={{ backgroundImage: `url(${heroImg})` }} aria-hidden="true" />
      <div className="veil" ref={veil} aria-hidden="true" />

      <div className="flyers" aria-hidden="true">
        {flyers.map((f, i) => (
          <div
            key={f.id}
            ref={(el) => (flyEls.current[i] = el)}
            className={`fly ${f.kind}`}
            style={{ '--c': f.color, '--s': `${f.size}px`, opacity: f.op }}
          />
        ))}
      </div>

      <div className="stage" aria-hidden="true"><Scene hoodie={hoodie} glow={glow} /></div>

      <div className="streaks" aria-hidden="true">
        {STREAKS.map((s, i) => (
          <div key={i} ref={(el) => (streakEls.current[i] = el)} className="streak"
            style={{ top: `${s.top}%`, height: s.h, '--c': s.c }} />
        ))}
      </div>

      <main>
        <section className="panel hero">
          <div className="hero-copy" ref={heroCopy}>
            <p className="eyebrow hero-fade">Portfolio 2026</p>
            <h1>
              <span className="mask"><span className="hero-line">Code</span></span>
              <span className="mask"><span className="hero-line">after dark.</span></span>
            </h1>
            <p className="sub hero-fade">Scroll to step inside the city.</p>
            <p className="cue hero-fade" aria-hidden="true">↓</p>
          </div>
        </section>

        <section className="panel room-gap scene" aria-label="Zainul Zaman, full stack developer">
          <h2 className="sr-only">Zainul Zaman, full stack developer</h2>
        </section>

        <section className="panel row reveal scene">
          <div className="copy">
            <h2>Vibe Edit</h2>
            <p>
              A video editor that runs in the browser and is driven by code. It has sign-in, a project
              dashboard, and an editor, and video is processed on the visitor's own device. I'm building it solo, and it's still in progress.
            </p>
            <a className="link" href="https://github.com/ZAINUL-ZAMAN/Vibe-Edit" target="_blank" rel="noreferrer">
              Read the Vibe Edit code on GitHub
            </a>
          </div>
          <div className="art"><EditorArt /></div>
        </section>

        <section className="panel row flip reveal scene">
          <div className="copy">
            <h2>What I build with</h2>
            <dl className="skills">
              <div><dt>Front end</dt><dd>React, Next.js, TypeScript, Tailwind CSS</dd></div>
              <div><dt>Back end</dt><dd>Supabase for sign-in and database</dd></div>
              <div><dt>In the browser</dt><dd>FFmpeg compiled to WebAssembly</dd></div>
              <div><dt>3D and motion</dt><dd>Three.js, React Three Fiber, GSAP. This page is built with them.</dd></div>
            </dl>
          </div>
          <div className="art"><OrbitArt /></div>
        </section>

        <section className="panel row reveal scene">
          <div className="copy">
            <h2>Change it. See it instantly.</h2>
            <p>This is the live-preview pattern: pick an option and the result updates on screen right away. Click the kid at the bottom to make him jump.</p>
            <Choice label="Hoodie" options={HOODIES} value={hoodie} onChange={setHoodie} />
            <Choice label="Glow" options={GLOWS} value={glow} onChange={setGlow} />
          </div>
          <div className="art"><PaletteArt /></div>
        </section>

        <section className="panel row flip reveal scene">
          <div className="copy">
            <h2>Let's build yours.</h2>
            <p>Tell me what your visitor should be able to preview, and I'll send back a plan.</p>
            <a className="link" href="https://github.com/ZAINUL-ZAMAN" target="_blank" rel="noreferrer">
              github.com/ZAINUL-ZAMAN
            </a>
          </div>
          <div className="art"><PlaneArt /></div>
        </section>
      </main>
    </>
  )
}
