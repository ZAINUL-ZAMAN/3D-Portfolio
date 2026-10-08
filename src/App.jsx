import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  DoubleSide,
} from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import heroImg from './assets/hero.jpg'

gsap.registerPlugin(ScrollTrigger)

// Shared scroll progress (0 → 1). GSAP writes it, the 3D scene reads it.
const scroll = { p: 0 }

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

const smoothstep = (a, b, x) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/* ---------------------------------------------------------------
   The character: built from simple shapes, with pivots at the
   shoulders, elbows, hips and knees so each limb can move.
---------------------------------------------------------------- */
function Character({ hoodie, glow }) {
  const { camera, size } = useThree()
  const root = useRef()
  const inner = useRef()
  const torso = useRef()
  const armL = useRef(), armR = useRef(), foreL = useRef(), foreR = useRef()
  const legL = useRef(), legR = useRef(), shinL = useRef(), shinR = useRef()
  const st = useRef({ x: 7, px: 7, v: 0, rot: -1.1, phase: 0, reach: 0, j: -1 })

  const m = useMemo(
    () => ({
      hood: new MeshStandardMaterial({ roughness: 0.8, emissiveIntensity: 0.55 }),
      dark: new MeshStandardMaterial({ color: '#16213f', emissive: '#12285a', emissiveIntensity: 0.8, roughness: 0.7 }),
      skin: new MeshStandardMaterial({ color: '#e7b496', roughness: 0.6 }),
      eye: new MeshBasicMaterial({ color: '#4aa8ff' }),
      glow: new MeshBasicMaterial(),
      ring: new MeshBasicMaterial({ transparent: true, opacity: 0.55, side: DoubleSide }),
    }),
    []
  )

  // Live preview: recolor the materials whenever the visitor picks something.
  useEffect(() => {
    m.hood.color.set(hoodie)
    m.hood.emissive.set(hoodie)
    m.glow.color.set(glow)
    m.ring.color.set(glow)
  }, [hoodie, glow, m])

  // Click or tap the character to make it jump.
  useEffect(() => {
    const hit = (e) => {
      const g = root.current
      if (!g || !g.visible) return false
      const s = g.scale.x
      const v = new Vector3(g.position.x, g.position.y + 0.35 * s, 0).project(camera)
      const cx = (v.x * 0.5 + 0.5) * size.width
      const cy = (-v.y * 0.5 + 0.5) * size.height
      const ppu = size.height / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z)
      return Math.abs(e.clientX - cx) < 0.8 * ppu * s && Math.abs(e.clientY - cy) < 1.6 * ppu * s
    }
    const down = (e) => {
      if (e.target.closest && e.target.closest('a,button')) return
      if (hit(e) && st.current.j < 0) st.current.j = 0
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

    // Where the character wants to stand: off-screen right at first, then it
    // walks to the side opposite each block of text and pauses there.
    const narrow = MathUtils.clamp(size.width / 1100, 0.45, 1)
    const xs = [7, -2.7 * narrow, 2.7 * narrow, -2.7 * narrow, 2.7 * narrow]
    const p = scroll.p
    const seg = Math.min(3, Math.floor(p * 4))
    const u = p * 4 - seg
    const target = xs[seg] + (xs[seg + 1] - xs[seg]) * smoothstep(0.25, 0.75, u)

    s.x = MathUtils.damp(s.x, target, 3, d)
    const vel = (s.x - s.px) / Math.max(d, 1e-3)
    s.px = s.x
    s.v = MathUtils.damp(s.v, vel, 10, d)
    const walk = MathUtils.clamp(Math.abs(s.v) / 1.0, 0, 1)
    const onScreen = Math.abs(s.x) < 3.4 ? 1 : 0

    // Face the direction of travel; when stopped, turn to face the text.
    const textSide = s.x < 0 ? 1 : -1
    const dir = walk > 0.25 ? Math.sign(s.v) : textSide
    s.rot = MathUtils.damp(s.rot, dir * 1.15, 6, d)

    s.phase += d * walk * 9
    const swing = Math.sin(s.phase) * 0.75 * walk
    s.reach = MathUtils.damp(s.reach, (1 - walk) * onScreen, 4, d)
    const reach = reduceMotion ? 0 : s.reach

    // Legs
    legL.current.rotation.x = swing
    legR.current.rotation.x = -swing
    shinL.current.rotation.x = Math.max(0, -Math.cos(s.phase)) * 1.0 * walk
    shinR.current.rotation.x = Math.max(0, Math.cos(s.phase)) * 1.0 * walk

    // Arms: swing while walking, reach toward the text when stopped
    const swingL = -swing * 0.8
    const swingR = swing * 0.8
    armR.current.rotation.x = MathUtils.lerp(swingR, -1.5 + Math.sin(t * 2) * 0.08, reach)
    armL.current.rotation.x = MathUtils.lerp(swingL, -1.0 + Math.sin(t * 2 + 1) * 0.08, reach)
    foreR.current.rotation.x = -(0.15 + 0.35 * walk) - 0.3 * reach
    foreL.current.rotation.x = -(0.15 + 0.35 * walk) - 0.2 * reach

    // Body motion
    let bob = Math.abs(Math.sin(s.phase)) * 0.07 * walk + Math.sin(t * 2) * 0.015 * (1 - walk)
    torso.current.scale.y = 1 + Math.sin(t * 2) * 0.012 * (1 - walk)
    inner.current.rotation.x = 0.1 * walk
    let spin = 0

    // Jump on click: hop, spin once, raise both arms, tuck the legs.
    if (s.j >= 0) {
      s.j += d
      const k = s.j / 0.85
      if (k >= 1) {
        s.j = -1
      } else {
        const air = Math.sin(Math.PI * k)
        bob += air * 1.3
        spin = k * k * (3 - 2 * k) * Math.PI * 2
        armR.current.rotation.x = MathUtils.lerp(armR.current.rotation.x, -2.9, air)
        armL.current.rotation.x = MathUtils.lerp(armL.current.rotation.x, -2.9, air)
        legL.current.rotation.x = MathUtils.lerp(legL.current.rotation.x, -0.7, air)
        legR.current.rotation.x = MathUtils.lerp(legR.current.rotation.x, -0.5, air)
        shinL.current.rotation.x = MathUtils.lerp(shinL.current.rotation.x, 1.1, air)
        shinR.current.rotation.x = MathUtils.lerp(shinR.current.rotation.x, 0.9, air)
      }
    }
    inner.current.rotation.y = spin

    const scale = 1.1 * MathUtils.clamp(size.width / 700, 0.65, 1)
    root.current.scale.setScalar(scale)
    root.current.position.set(s.x, -0.76 * scale + bob, 0)
    root.current.rotation.y = s.rot
    root.current.visible = Math.abs(s.x) < 8
  })

  return (
    <group ref={root}>
      <pointLight color={glow} intensity={6} distance={9} position={[1.2, 1.2, 1.6]} />
      <pointLight color="#2f6bff" intensity={5} distance={9} position={[-1.6, 0.8, -1.4]} />

      <group ref={inner}>
        {/* neon ring on the floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.28, 0]} material={m.ring}>
          <ringGeometry args={[0.55, 0.75, 40]} />
        </mesh>

        {/* torso + hood */}
        <group ref={torso}>
          <mesh position={[0, 0.4, 0]} scale={[1.15, 1, 0.75]} material={m.hood}>
            <capsuleGeometry args={[0.4, 0.55, 8, 16]} />
          </mesh>
          <mesh position={[0, 1.15, -0.14]} material={m.hood}>
            <sphereGeometry args={[0.4, 16, 16]} />
          </mesh>
          <mesh position={[0, 0.55, 0.3]} material={m.glow}>
            <boxGeometry args={[0.03, 0.55, 0.01]} />
          </mesh>
        </group>

        {/* head */}
        <group position={[0, 1.5, 0]}>
          <mesh material={m.skin}>
            <sphereGeometry args={[0.36, 24, 24]} />
          </mesh>
          <mesh position={[0, 0.02, -0.03]} material={m.dark}>
            <sphereGeometry args={[0.39, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          </mesh>
          {[
            [-0.3, 0.3, 0.02, 0.75],
            [-0.16, 0.38, 0, 0.3],
            [0, 0.42, 0.02, 0],
            [0.16, 0.38, 0, -0.3],
            [0.3, 0.3, 0.02, -0.75],
            [0.0, 0.32, -0.28, 0],
          ].map(([x, y, z, rz], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0, 0, rz]} material={m.dark}>
              <coneGeometry args={[0.1, 0.3, 6]} />
            </mesh>
          ))}
          {/* eyes */}
          {[-0.13, 0.13].map((x) => (
            <mesh key={x} position={[x, 0.07, 0.335]} scale={[1, 1, 0.4]} material={m.eye}>
              <sphereGeometry args={[0.05, 12, 12]} />
            </mesh>
          ))}
          {/* face mask */}
          <mesh position={[0, -0.14, 0.27]} material={m.dark}>
            <boxGeometry args={[0.56, 0.24, 0.14]} />
          </mesh>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, -0.13, 0.345]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]} material={m.glow}>
              <boxGeometry args={[0.022, 0.16, 0.01]} />
            </mesh>
          ))}
          {/* headphones */}
          <mesh material={m.dark}>
            <torusGeometry args={[0.44, 0.035, 8, 32, Math.PI]} />
          </mesh>
          {[-1, 1].map((sx) => (
            <group key={sx} position={[sx * 0.43, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={m.dark}>
                <cylinderGeometry args={[0.15, 0.15, 0.1, 20]} />
              </mesh>
              <mesh position={[sx * 0.055, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={m.glow}>
                <torusGeometry args={[0.1, 0.016, 8, 24]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* arms */}
        {[
          { side: 1, arm: armR, fore: foreR },
          { side: -1, arm: armL, fore: foreL },
        ].map(({ side, arm, fore }) => (
          <group key={side} ref={arm} position={[side * 0.6, 0.85, 0]}>
            <mesh position={[0, -0.32, 0]} material={m.hood}>
              <capsuleGeometry args={[0.13, 0.38, 6, 12]} />
            </mesh>
            <group ref={fore} position={[0, -0.66, 0]}>
              <mesh position={[0, -0.3, 0]} material={m.hood}>
                <capsuleGeometry args={[0.115, 0.34, 6, 12]} />
              </mesh>
              <mesh position={[0, -0.3, 0.118]} material={m.glow}>
                <boxGeometry args={[0.025, 0.4, 0.01]} />
              </mesh>
              <mesh position={[0, -0.64, 0]} material={m.skin}>
                <sphereGeometry args={[0.11, 12, 12]} />
              </mesh>
            </group>
          </group>
        ))}

        {/* legs */}
        {[
          { side: 1, leg: legR, shin: shinR },
          { side: -1, leg: legL, shin: shinL },
        ].map(({ side, leg, shin }) => (
          <group key={side} ref={leg} position={[side * 0.2, -0.05, 0]}>
            <mesh position={[0, -0.3, 0]} material={m.dark}>
              <capsuleGeometry args={[0.16, 0.3, 6, 12]} />
            </mesh>
            <group ref={shin} position={[0, -0.6, 0]}>
              <mesh position={[0, -0.28, 0]} material={m.dark}>
                <capsuleGeometry args={[0.14, 0.28, 6, 12]} />
              </mesh>
              <mesh position={[0, -0.58, 0.08]} material={m.dark}>
                <boxGeometry args={[0.28, 0.14, 0.45]} />
              </mesh>
              <mesh position={[0, -0.645, 0.08]} material={m.glow}>
                <boxGeometry args={[0.29, 0.03, 0.46]} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

function Scene({ hoodie, glow }) {
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 1.75]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} color="#8fb4ff" intensity={1.4} />
      <Character hoodie={hoodie} glow={glow} />
    </Canvas>
  )
}

function Choice({ options, value, onChange, label, swatch }) {
  return (
    <div className="choice" role="group" aria-label={label}>
      <span className="choice-label">{label}</span>
      <div className="choice-row">
        {options.map((o) =>
          swatch ? (
            <button
              key={o.id}
              type="button"
              className={value === o.id ? 'swatch on' : 'swatch'}
              style={{ background: o.id }}
              aria-label={o.label}
              aria-pressed={value === o.id}
              onClick={() => onChange(o.id)}
            />
          ) : (
            <button
              key={o.id}
              type="button"
              className={value === o.id ? 'chip on' : 'chip'}
              aria-pressed={value === o.id}
              onClick={() => onChange(o.id)}
            >
              {o.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [hoodie, setHoodie] = useState(HOODIES[0].id)
  const [glow, setGlow] = useState(GLOWS[0].id)
  const bar = useRef()
  const veil = useRef()

  useEffect(() => {
    // One scroll trigger drives the 3D scene, the progress bar and the dimming of the background.
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        scroll.p = self.progress
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
        if (veil.current) veil.current.style.opacity = Math.min(0.96, self.progress * 5)
      },
    })

    // Each block of text slides in toward the character as you scroll to it.
    const ctx = gsap.context(() => {
      if (reduceMotion) return
      gsap.utils.toArray('.panel.reveal').forEach((panel) => {
        const side = panel.classList.contains('right') ? 1 : -1
        gsap.from(panel.querySelector('.copy'), {
          opacity: 0,
          x: side * 60,
          ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top 80%', end: 'top 35%', scrub: true },
        })
      })
    })
    return () => {
      st.kill()
      ctx.revert()
    }
  }, [])

  return (
    <>
      <div className="progress" aria-hidden="true">
        <div className="progress-bar" ref={bar} />
      </div>

      <div className="bg" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden="true" />
      <div className="veil" ref={veil} aria-hidden="true" />

      <div className="stage" aria-hidden="true">
        <Scene hoodie={hoodie} glow={glow} />
      </div>

      <main>
        <section className="panel hero">
          <h1 className="sr-only">Zainul Zaman, full stack developer</h1>
          <p className="hint">Scroll to explore. Click the character.</p>
        </section>

        <section className="panel right reveal">
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
        </section>

        <section className="panel left reveal">
          <div className="copy">
            <h2>What I build with</h2>
            <dl className="skills">
              <div><dt>Front end</dt><dd>React, Next.js, TypeScript, Tailwind CSS</dd></div>
              <div><dt>Back end</dt><dd>Supabase for sign-in and database</dd></div>
              <div><dt>In the browser</dt><dd>FFmpeg compiled to WebAssembly</dd></div>
              <div><dt>3D and motion</dt><dd>Three.js, React Three Fiber, GSAP. This page is built with them.</dd></div>
            </dl>
          </div>
        </section>

        <section className="panel right reveal">
          <div className="copy">
            <h2>Change it. See it instantly.</h2>
            <p>This is the live-preview pattern: your visitor picks options and the result updates on screen right away.</p>
            <Choice label="Hoodie" options={HOODIES} value={hoodie} onChange={setHoodie} swatch />
            <Choice label="Glow" options={GLOWS} value={glow} onChange={setGlow} swatch />
          </div>
        </section>

        <section className="panel left reveal">
          <div className="copy">
            <h2>Let's build yours.</h2>
            <p>Tell me what your visitor should be able to preview, and I'll send back a plan.</p>
            <a className="link" href="https://github.com/ZAINUL-ZAMAN" target="_blank" rel="noreferrer">
              github.com/ZAINUL-ZAMAN
            </a>
          </div>
        </section>
      </main>
    </>
  )
}
