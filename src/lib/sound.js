let ctx = null

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, startTime, duration, { type = 'sine', gain = 0.12 } = {}) {
  const audioCtx = getCtx()
  if (!audioCtx) return
  const osc = audioCtx.createOscillator()
  const g = audioCtx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)
  g.gain.setValueAtTime(0, startTime)
  g.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.connect(g)
  g.connect(audioCtx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.02)
}

export function playGateOpen() {
  const audioCtx = getCtx()
  if (!audioCtx) return
  const t = audioCtx.currentTime
  tone(440, t, 0.14, { type: 'square', gain: 0.08 })
  tone(660, t + 0.08, 0.18, { type: 'square', gain: 0.09 })
  tone(880, t + 0.16, 0.22, { type: 'triangle', gain: 0.1 })
}

export function playTick() {
  const audioCtx = getCtx()
  if (!audioCtx) return
  tone(1200, audioCtx.currentTime, 0.04, { type: 'square', gain: 0.03 })
}

export function playFanfare() {
  const audioCtx = getCtx()
  if (!audioCtx) return
  const t = audioCtx.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => tone(f, t + i * 0.12, 0.35, { type: 'triangle', gain: 0.11 }))
}
