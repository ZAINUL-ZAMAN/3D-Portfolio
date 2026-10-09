// Sound effects made in the browser with the Web Audio API, so no audio files are needed.
// Sound stays off until the visitor turns it on, because browsers block audio before a click.
let ctx = null
let master = null
let noise = null
let on = false

export function isSoundOn() {
  return on
}

export function enableSound() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return false
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') ctx.resume()
  on = true
  return true
}

export function disableSound() {
  on = false
}

// A whoosh: filtered noise that sweeps in pitch and pans across the speakers.
export function swoosh(strength = 0.5, dir = 1) {
  if (!on || !ctx) return
  const t = ctx.currentTime
  const dur = 0.3 + 0.35 * strength
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.8 + Math.random() * 0.5
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.1
  bp.frequency.setValueAtTime(dir > 0 ? 450 : 3600, t)
  bp.frequency.exponentialRampToValueAtTime(dir > 0 ? 3600 : 450, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.05 + 0.2 * strength, t + dur * 0.4)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp).connect(g)
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner()
    pan.pan.setValueAtTime(-0.8 * dir, t)
    pan.pan.linearRampToValueAtTime(0.8 * dir, t + dur)
    g.connect(pan).connect(master)
  } else {
    g.connect(master)
  }
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.05)
}

// A bouncy "boing" for the kid's jump.
export function boing() {
  if (!on || !ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(260, t)
  osc.frequency.exponentialRampToValueAtTime(760, t + 0.16)
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.3)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + 0.35)
}
