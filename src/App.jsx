import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshDistortMaterial } from '@react-three/drei'
import { MathUtils } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Shared scroll progress (0 → 1). GSAP writes it, the 3D scene reads it.
const scroll = { p: 0 }

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const COLORS = [
  { name: 'Saffron', value: '#F2B134' },
  { name: 'Teal', value: '#2FB5A8' },
  { name: 'Coral', value: '#E8604C' },
  { name: 'Ice', value: '#CFE3F2' },
]
const SHAPES = [
  { id: 'knot', label: 'Knot' },
  { id: 'orb', label: 'Orb' },
  { id: 'crystal', label: 'Crystal' },
]
const FINISHES = [
  { id: 'glossy', label: 'Glossy' },
  { id: 'liquid', label: 'Liquid' },
]

function Hero({ shape, color, finish }) {
  const group = useRef()
  const smooth = useRef(0)

  useFrame((state, dt) => {
    // Ease toward the real scroll value so motion feels smooth, not jumpy.
    smooth.current = MathUtils.damp(smooth.current, scroll.p, 4, dt)
    const p = smooth.current
    const g = group.current
    const narrow = Math.min(1, state.size.width / 1000)

    // Object swings left/right as sections alternate, tumbles and breathes with scroll.
    g.position.x = Math.cos(p * Math.PI * 4) * 1.8 * narrow
    g.position.y = Math.sin(p * Math.PI * 6) * 0.25
    g.rotation.x = p * Math.PI * 2
    g.rotation.y += reduceMotion ? 0 : dt * 0.25
    g.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.35)
    state.camera.position.z = 6.5 - p * 1.2
  })

  return (
    <group ref={group}>
      <mesh>
        {shape === 'knot' && <torusKnotGeometry args={[1, 0.34, 220, 36]} />}
        {shape === 'orb' && <icosahedronGeometry args={[1.45, 12]} />}
        {shape === 'crystal' && <octahedronGeometry args={[1.7, 0]} />}
        {finish === 'liquid' ? (
          <MeshDistortMaterial color={color} distort={0.35} speed={2} roughness={0.2} metalness={0.3} />
        ) : (
          <meshPhysicalMaterial color={color} roughness={0.15} metalness={0.6} clearcoat={1} clearcoatRoughness={0.1} />
        )}
      </mesh>
    </group>
  )
}

function Scene({ shape, color, finish }) {
  return (
    <Canvas camera={{ position: [0, 0, 6.5], fov: 45 }} dpr={[1, 1.75]}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      {/* Built-in light shapes, so no files are downloaded for reflections */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={4} position={[0, 4, -3]} scale={[10, 2, 1]} />
        <Lightformer form="circle" intensity={3} position={[-5, 1, 2]} scale={4} />
        <Lightformer form="rect" intensity={2} position={[5, -2, 2]} scale={[4, 4, 1]} />
      </Environment>
      <Hero shape={shape} color={color} finish={finish} />
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
            className={value === o.id ? 'chip on' : 'chip'}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [shape, setShape] = useState('knot')
  const [color, setColor] = useState(COLORS[0].value)
  const [finish, setFinish] = useState('glossy')
  const bar = useRef()

  useEffect(() => {
    // One scroll trigger drives both the 3D scene and the progress bar.
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        scroll.p = self.progress
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`
      },
    })

    // The single orchestrated moment: the hero headline assembles on load.
    let tl
    if (!reduceMotion) {
      tl = gsap.from('.hero-line', {
        yPercent: 110,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.12,
        delay: 0.2,
      })
    }
    return () => {
      st.kill()
      tl && tl.kill()
    }
  }, [])

  return (
    <>
      <div className="progress" aria-hidden="true">
        <div className="progress-bar" ref={bar} />
      </div>

      <div className="stage" aria-hidden="true">
        <Scene shape={shape} color={color} finish={finish} />
      </div>

      <main>
        <section className="panel left">
          <div className="copy">
            <h1>
              <span className="mask"><span className="hero-line">Zainul builds</span></span>
              <span className="mask"><span className="hero-line">websites that</span></span>
              <span className="mask"><span className="hero-line">move with you.</span></span>
            </h1>
            <p>Self-taught web developer. Scroll slowly: the object on this page is a live 3D scene tied to your scroll position.</p>
          </div>
        </section>

        <section className="panel right">
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

        <section className="panel left">
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

        <section className="panel right">
          <div className="copy">
            <h2>Change it. See it instantly.</h2>
            <p>This is the live-preview pattern: your visitor picks options and the result updates on screen right away.</p>
            <Choice label="Shape" options={SHAPES} value={shape} onChange={setShape} />
            <Choice label="Finish" options={FINISHES} value={finish} onChange={setFinish} />
            <div className="choice" role="group" aria-label="Color">
              <span className="choice-label">Color</span>
              <div className="choice-row">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={color === c.value ? 'swatch on' : 'swatch'}
                    style={{ background: c.value }}
                    aria-label={c.name}
                    aria-pressed={color === c.value}
                    onClick={() => setColor(c.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel left">
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
