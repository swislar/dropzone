import { useEffect, useRef, useState } from 'react'
import { RaceSimulation } from '../lib/simulation'
import { generateCourse } from '../lib/courseGenerator'
import { playGateOpen } from '../lib/sound'
import './pinball-board.css'

const FIXED_DT = (1000 / 60) * 0.5
const MAX_STEPS_PER_FRAME = 5

export default function PinballBoard({ players, seed, muted, onFinished, onReset }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const courseRef = useRef(null)
  const rafRef = useRef(null)
  const accumulatorRef = useRef(0)
  const lastTsRef = useRef(0)
  const finishedNotifiedRef = useRef(false)

  const [elapsedMs, setElapsedMs] = useState(0)
  const [isReleased, setIsReleased] = useState(false)
  const [finishCountdown, setFinishCountdown] = useState(null)
  const [winnerName, setWinnerName] = useState(null)

  useEffect(() => {
    const course = generateCourse(seed, players.length)
    courseRef.current = course
    const sim = new RaceSimulation(course, players)
    simRef.current = sim

    finishedNotifiedRef.current = false
    accumulatorRef.current = 0
    lastTsRef.current = 0
    setIsReleased(false)
    setFinishCountdown(null)
    setWinnerName(null)

    const canvas = canvasRef.current
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    canvas.width = course.width * dpr
    canvas.height = course.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    function frame(ts) {
      if (!lastTsRef.current) lastTsRef.current = ts
      let delta = ts - lastTsRef.current
      lastTsRef.current = ts
      if (delta > 250) delta = 250

      accumulatorRef.current += delta
      let steps = 0
      let snapshot = sim.getSnapshot()
      while (accumulatorRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        snapshot = sim.step(FIXED_DT)
        accumulatorRef.current -= FIXED_DT
        steps++
      }

      draw3DPinballPlayfield(ctx, course, players, snapshot)

      setElapsedMs(snapshot.elapsedMs)
      setIsReleased(snapshot.isReleased)
      setFinishCountdown(snapshot.finishCountdown)

      if (snapshot.results.length > 0 && !winnerName) {
        const winPlayer = players.find((p) => p.id === snapshot.results[0].id)
        if (winPlayer) setWinnerName(winPlayer.name)
      }

      if (snapshot.allFinished && !finishedNotifiedRef.current) {
        finishedNotifiedRef.current = true
        const ranked = snapshot.results
          .slice()
          .sort((a, b) => a.timeMs - b.timeMs)
          .map((r, i) => ({
            ...players.find((p) => p.id === r.id),
            timeMs: r.timeMs,
            place: i + 1,
          }))
        setTimeout(() => onFinished(ranked), 600)
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafRef.current)
      sim.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, seed])

  function handleRelease() {
    if (simRef.current) {
      simRef.current.release()
      setIsReleased(true)
      if (!muted) playGateOpen()
    }
  }

  return (
    <div className="board" ref={wrapRef}>
      <div className="board__hud">
        <div className="board__timer">
          ⏱ {(elapsedMs / 1000).toFixed(1)}s
        </div>
        <div className={`board__status ${finishCountdown !== null ? 'board__status--finishing' : ''}`}>
          {!isReleased ? (
            'Ready to drop'
          ) : finishCountdown !== null ? (
            `🏆 Winner: ${winnerName || '1st'}! Ends in ${finishCountdown.toFixed(1)}s`
          ) : (
            'Goal: Land in GOLDEN SLOT 👑'
          )}
        </div>
        {onReset && (
          <button className="board__btn-reset" type="button" onClick={onReset} title="Back to Setup">
            ⚙️ Menu
          </button>
        )}
      </div>

      <div className="board__frame">
        <canvas ref={canvasRef} className="board__canvas" />

        {!isReleased && (
          <div className="board__overlay">
            <button className="btn btn--drop" type="button" onClick={handleRelease}>
              🚀 Release Balls
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Rich 3D Night-Carnival Marquee Pinball Renderer
 */
function draw3DPinballPlayfield(ctx, course, players, snapshot) {
  const { width, height, tubeWidth, pods, bumpers, slingshots, pegs, goldenSlot, themeColor = '#34e4c1' } = course
  const playerById = new Map(players.map((p) => [p.id, p]))

  ctx.clearRect(0, 0, width, height)

  // 1. Cabinet Playfield Background
  const bgGrad = ctx.createRadialGradient(width / 2, height * 0.4, 40, width / 2, height / 2, height * 0.7)
  bgGrad.addColorStop(0, '#24143d')
  bgGrad.addColorStop(0.5, '#150b26')
  bgGrad.addColorStop(1, '#090412')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // 2. 3D Extruded Metallic Launch Tubes
  draw3DLaunchTubes(ctx, width, height, tubeWidth, themeColor)

  // 3. Solid 3D Textured Individual Pod Boxes
  draw3DSolidPodBoxes(ctx, pods, players, snapshot.isReleased, snapshot.elapsedMs, snapshot.releaseTimeMs, themeColor)

  // 4. 3D Slingshots
  for (const s of slingshots) {
    draw3DSlingshot(ctx, s)
  }

  // 5. 3D Pop Bumpers (including center Gatekeeper Bumper above Win Pit)
  for (const b of bumpers) {
    draw3DPopBumper(ctx, b)
  }

  // 6. 3D Pinball Peg Posts
  for (const p of pegs) {
    draw3DPeg(ctx, p)
  }

  // 7. HIGH-CONTRAST SOLID Theme Color Corner Wing Pentagons & Outward Funnel Booster Kickers
  draw3DFunnelsAndWingPentagons(ctx, width, tubeWidth, goldenSlot, themeColor, snapshot.elapsedMs)

  // 8. 3D Metallic Coiled Spring Plungers
  const leftFired = snapshot.springFires && snapshot.springFires.some((sf) => sf.side === 'left')
  const rightFired = snapshot.springFires && snapshot.springFires.some((sf) => sf.side === 'right')
  draw3DSpringPlunger(ctx, tubeWidth / 2, 765, 715 + (leftFired ? 18 : 0), leftFired)
  draw3DSpringPlunger(ctx, width - tubeWidth / 2, 765, 715 + (rightFired ? 18 : 0), rightFired)

  // 9. Enclosed 3D Golden Win Pit (Enclosed between funnels y = 654..775)
  draw3DGoldenWinPit(ctx, goldenSlot)

  // 10. 3D Marquee Glass Balls
  const showLabels = players.length <= 16
  for (const b of snapshot.balls) {
    const player = playerById.get(b.id)
    if (!player) continue
    draw3DMarble(ctx, b, player, snapshot.ballRadius, showLabels)
  }

  // 11. Outer Beveled 3D Cabinet Frame
  draw3DCabinetBevel(ctx, width, height)
}

function draw3DLaunchTubes(ctx, width, height, tubeWidth, themeColor) {
  ctx.save()

  // Deep Tube Channel Grooves
  ctx.fillStyle = 'rgba(5, 2, 12, 0.75)'
  ctx.fillRect(0, 0, tubeWidth, height)
  ctx.fillRect(width - tubeWidth, 0, tubeWidth, height)

  // Textured Tube Floor Grating
  ctx.strokeStyle = `${themeColor}26`
  ctx.lineWidth = 1
  for (let y = 100; y < 650; y += 16) {
    ctx.beginPath()
    ctx.moveTo(4, y)
    ctx.lineTo(tubeWidth - 4, y)
    ctx.moveTo(width - tubeWidth + 4, y)
    ctx.lineTo(width - 4, y)
    ctx.stroke()
  }

  // Inner 3D Tube Wall Shadow
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(tubeWidth + 2, 120)
  ctx.lineTo(tubeWidth + 2, 635)
  ctx.moveTo(width - (tubeWidth - 2), 120)
  ctx.lineTo(width - (tubeWidth - 2), 635)
  ctx.stroke()

  // Dual Neon Tube Rails
  ctx.strokeStyle = themeColor
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 120)
  ctx.lineTo(tubeWidth, 635)
  ctx.moveTo(width - tubeWidth, 120)
  ctx.lineTo(width - tubeWidth, 635)
  ctx.stroke()

  // Inner White Specular Light Filament
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 120)
  ctx.lineTo(tubeWidth, 635)
  ctx.moveTo(width - tubeWidth, 120)
  ctx.lineTo(width - tubeWidth, 635)
  ctx.stroke()

  // FULLY SYMMETRICAL 3D TOP ARCH HOODS
  ctx.lineWidth = 5.5
  ctx.strokeStyle = themeColor
  ctx.beginPath()
  ctx.arc(tubeWidth + 30, 75, 45, Math.PI, Math.PI * 1.5, false)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(width - (tubeWidth + 30), 75, 45, Math.PI * 1.5, Math.PI * 2, false)
  ctx.stroke()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(tubeWidth + 30, 75, 45, Math.PI, Math.PI * 1.5, false)
  ctx.arc(width - (tubeWidth + 30), 75, 45, Math.PI * 1.5, Math.PI * 2, false)
  ctx.stroke()

  ctx.restore()
}

function draw3DSolidPodBoxes(ctx, pods, players, isReleased, elapsedMs, releaseTimeMs, themeColor) {
  if (!pods || pods.length === 0) return

  ctx.save()

  let animProgress = 0
  if (isReleased && releaseTimeMs !== null) {
    animProgress = Math.min(1.0, (elapsedMs - releaseTimeMs) / 400)
  }

  for (let i = 0; i < pods.length; i++) {
    const pod = pods[i]
    const player = players[i]

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.beginPath()
    ctx.roundRect(pod.x + 2, pod.y + 3, pod.width - 4, pod.height - 4, 8)
    ctx.fill()

    const boxGrad = ctx.createLinearGradient(pod.x, pod.y, pod.x, pod.y + pod.height)
    boxGrad.addColorStop(0, '#2c1e45')
    boxGrad.addColorStop(0.5, '#1e1433')
    boxGrad.addColorStop(1, '#140c26')
    ctx.fillStyle = boxGrad
    ctx.beginPath()
    ctx.roundRect(pod.x, pod.y, pod.width - 4, pod.height - 4, 8)
    ctx.fill()

    ctx.strokeStyle = player ? player.color : '#e8b33d'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(pod.x + 2, pod.y + 2, pod.width - 8, 4, 2)
    ctx.stroke()

    const doorAngle = animProgress * (Math.PI / 2)
    const doorW = (pod.width - 4) / 2
    const doorY = pod.y + pod.height - 4

    ctx.save()
    ctx.translate(pod.x + 2, doorY)

    ctx.fillStyle = animProgress > 0.8 ? themeColor : '#ff3e7f'
    ctx.strokeStyle = '#fbd671'
    ctx.lineWidth = 2
    ctx.save()
    ctx.rotate(doorAngle)
    ctx.fillRect(0, -2, doorW, 5)
    ctx.strokeRect(0, -2, doorW, 5)
    ctx.restore()

    ctx.translate(pod.width - 4, 0)
    ctx.save()
    ctx.rotate(-doorAngle)
    ctx.fillRect(-doorW, -2, doorW, 5)
    ctx.strokeRect(-doorW, -2, doorW, 5)
    ctx.restore()

    ctx.fillStyle = '#fbd671'
    ctx.beginPath()
    ctx.arc(pod.x + 4, doorY, 2.5, 0, Math.PI * 2)
    ctx.arc(pod.x + pod.width - 4, doorY, 2.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  ctx.restore()
}

function draw3DPopBumper(ctx, b) {
  ctx.save()

  ctx.beginPath()
  ctx.arc(b.x + 3, b.y + 4, b.r + 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 62, 127, 0.22)'
  ctx.fill()

  const ringGrad = ctx.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r)
  ringGrad.addColorStop(0, '#ffffff')
  ringGrad.addColorStop(0.3, '#fbd671')
  ringGrad.addColorStop(0.7, '#e8b33d')
  ringGrad.addColorStop(1, '#664800')
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
  ctx.fillStyle = ringGrad
  ctx.fill()

  const domeGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, 2, b.x, b.y, b.r * 0.8)
  domeGrad.addColorStop(0, '#ff7ca8')
  domeGrad.addColorStop(0.5, '#ff3e7f')
  domeGrad.addColorStop(1, '#9e0037')
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r * 0.78, 0, Math.PI * 2)
  ctx.fillStyle = domeGrad
  ctx.fill()

  const lensGrad = ctx.createRadialGradient(b.x - b.r * 0.15, b.y - b.r * 0.15, 1, b.x, b.y, b.r * 0.38)
  lensGrad.addColorStop(0, '#ffffff')
  lensGrad.addColorStop(0.4, '#fbd671')
  lensGrad.addColorStop(1, '#c9922f')
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r * 0.38, 0, Math.PI * 2)
  ctx.fillStyle = lensGrad
  ctx.fill()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(b.x, b.y, b.r * 0.65, Math.PI * 1.1, Math.PI * 1.6)
  ctx.stroke()

  ctx.restore()
}

function draw3DSlingshot(ctx, s) {
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(s.angle)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.beginPath()
  ctx.roundRect(-s.width / 2 + 2, -s.height / 2 + 3, s.width, s.height, 6)
  ctx.fill()

  const grad = ctx.createLinearGradient(-s.width / 2, 0, s.width / 2, 0)
  grad.addColorStop(0, '#ff7ca8')
  grad.addColorStop(0.5, '#ff3e7f')
  grad.addColorStop(1, '#9e0037')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(-s.width / 2, -s.height / 2, s.width, s.height, 6)
  ctx.fill()

  ctx.strokeStyle = '#fbd671'
  ctx.lineWidth = 2.5
  ctx.stroke()

  ctx.fillStyle = '#fbd671'
  ctx.beginPath()
  ctx.arc(0, -s.height / 2 + 8, 3, 0, Math.PI * 2)
  ctx.arc(0, s.height / 2 - 8, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function draw3DPeg(ctx, p) {
  ctx.save()

  ctx.beginPath()
  ctx.arc(p.x + 1.5, p.y + 2, p.r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fill()

  const pegGrad = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.35, 1, p.x, p.y, p.r)
  pegGrad.addColorStop(0, '#ffffff')
  pegGrad.addColorStop(0.3, '#fbd671')
  pegGrad.addColorStop(0.8, '#e8b33d')
  pegGrad.addColorStop(1, '#805700')
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
  ctx.fillStyle = pegGrad
  ctx.fill()

  ctx.restore()
}

/**
 * Draws HIGH-CONTRAST SOLID Theme Color Left & Right Wing Pentagons with Animated Funnel Booster Lights
 */
function draw3DFunnelsAndWingPentagons(ctx, width, tubeWidth, goldenSlot, themeColor, elapsedMs) {
  ctx.save()

  // 1. Left Corner Wing Pentagon
  const leftWingGrad = ctx.createLinearGradient(tubeWidth, 654, goldenSlot.xMin, 775)
  leftWingGrad.addColorStop(0, '#1c122e')
  leftWingGrad.addColorStop(0.4, `${themeColor}cc`)
  leftWingGrad.addColorStop(1, `${themeColor}77`)

  ctx.fillStyle = leftWingGrad
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMin, 654)
  ctx.lineTo(goldenSlot.xMin, 775)
  ctx.lineTo(tubeWidth, 775)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = themeColor
  ctx.lineWidth = 3.5
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 2. Right Corner Wing Pentagon
  const rightWingGrad = ctx.createLinearGradient(width - tubeWidth, 654, goldenSlot.xMax, 775)
  rightWingGrad.addColorStop(0, '#1c122e')
  rightWingGrad.addColorStop(0.4, `${themeColor}cc`)
  rightWingGrad.addColorStop(1, `${themeColor}77`)

  ctx.fillStyle = rightWingGrad
  ctx.beginPath()
  ctx.moveTo(width - tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMax, 654)
  ctx.lineTo(goldenSlot.xMax, 775)
  ctx.lineTo(width - tubeWidth, 775)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = themeColor
  ctx.lineWidth = 3.5
  ctx.stroke()

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 3. Funnel Ramp Rail Surface Shadows
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 698)
  ctx.lineTo(goldenSlot.xMin, 658)
  ctx.moveTo(width - tubeWidth, 698)
  ctx.lineTo(goldenSlot.xMax, 658)
  ctx.stroke()

  // 4. Exact Surface Contact Funnel Rails
  ctx.strokeStyle = themeColor
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMin, 654)
  ctx.moveTo(width - tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMax, 654)
  ctx.stroke()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMin, 654)
  ctx.moveTo(width - tubeWidth, 694)
  ctx.lineTo(goldenSlot.xMax, 654)
  ctx.stroke()

  // 5. ANIMATED ROTATED 3D NEON BOOSTER CHEVRON STRIPS (Aligned 1-to-1 with pentagon slope)
  drawRotatedBoosterChevronStrip(ctx, tubeWidth, 694, goldenSlot.xMin, 654, themeColor, elapsedMs, 'left')
  drawRotatedBoosterChevronStrip(ctx, width - tubeWidth, 694, goldenSlot.xMax, 654, themeColor, elapsedMs, 'right')

  ctx.restore()
}

/**
 * Draws large 3D extruded neon chevron booster strips rotated to match the pentagon slope
 */
function drawRotatedBoosterChevronStrip(ctx, x1, y1, x2, y2, themeColor, elapsedMs, _side) {
  ctx.save()

  const dx = x1 - x2
  const dy = y1 - y2
  const len = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2

  ctx.translate(midX, midY - 14)
  ctx.rotate(angle)

  // Draw 3 Large 3D Extruded Neon Chevron Arrowheads
  const numChevrons = 3
  const spacing = len / (numChevrons + 1)
  const startX = -len / 2 + spacing

  const stepIndex = Math.floor(elapsedMs * 0.007) % numChevrons

  for (let i = 0; i < numChevrons; i++) {
    const cx = startX + i * spacing
    const isFlashing = i === stepIndex
    const alpha = isFlashing ? 0.90 : 0.35

    ctx.save()
    ctx.translate(cx, 0)
    ctx.globalAlpha = alpha

    // Chevron shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-10, -9)
    ctx.lineTo(6, 0)
    ctx.lineTo(-10, 9)
    ctx.stroke()

    // Outer Neon Glow
    ctx.strokeStyle = themeColor
    ctx.shadowColor = themeColor
    ctx.shadowBlur = isFlashing ? 14 : 6
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-10, -9)
    ctx.lineTo(6, 0)
    ctx.lineTo(-10, 9)
    ctx.stroke()

    // Inner Specular White Core
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-9, -7)
    ctx.lineTo(4, 0)
    ctx.lineTo(-9, 7)
    ctx.stroke()

    ctx.restore()
  }

  ctx.restore()
}

function draw3DSpringPlunger(ctx, cx, bottomY, topY, isFired) {
  ctx.save()

  ctx.fillStyle = '#1c122e'
  ctx.strokeStyle = '#4a3966'
  ctx.lineWidth = 3
  ctx.fillRect(cx - 16, bottomY - 6, 32, 12)
  ctx.strokeRect(cx - 16, bottomY - 6, 32, 12)

  const coils = 7
  const height = bottomY - topY
  const step = height / coils
  const radius = 11

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(cx + 2, bottomY + 2)
  for (let i = 0; i <= coils; i++) {
    const y = bottomY - i * step + 2
    const x = cx + 2 + (i % 2 === 0 ? -radius : radius)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(cx + 2, topY + 2)
  ctx.stroke()

  ctx.strokeStyle = isFired ? '#ff3e7f' : '#fbd671'
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, bottomY)
  for (let i = 0; i <= coils; i++) {
    const y = bottomY - i * step
    const x = cx + (i % 2 === 0 ? -radius : radius)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(cx, topY)
  ctx.stroke()

  ctx.fillStyle = isFired ? '#ff3e7f' : '#e8b33d'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.roundRect(cx - 15, topY - 7, 30, 10, 4)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

/**
 * Draws the FULL ENCLOSED Central Golden Win Pit (y = 654..775)
 */
function draw3DGoldenWinPit(ctx, goldenSlot) {
  ctx.save()
  const winW = goldenSlot.xMax - goldenSlot.xMin
  const winY = 654
  const winH = 775 - 654

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  ctx.fillRect(goldenSlot.xMin, winY, winW, winH)

  const winGrad = ctx.createLinearGradient(goldenSlot.xMin, winY, goldenSlot.xMax, winY + winH)
  winGrad.addColorStop(0, 'rgba(232, 179, 61, 0.65)')
  winGrad.addColorStop(0.5, 'rgba(251, 214, 113, 0.45)')
  winGrad.addColorStop(1, 'rgba(180, 120, 20, 0.75)')
  ctx.fillStyle = winGrad
  ctx.fillRect(goldenSlot.xMin, winY, winW, winH)

  ctx.strokeStyle = '#fbd671'
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.moveTo(goldenSlot.xMin, winY)
  ctx.lineTo(goldenSlot.xMin, winY + winH)
  ctx.moveTo(goldenSlot.xMax, winY)
  ctx.lineTo(goldenSlot.xMax, winY + winH)
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.fillRect(goldenSlot.xMin, winY, winW, 4)

  ctx.font = '700 13px "Bungee", sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.shadowColor = '#e8b33d'
  ctx.shadowBlur = 10
  ctx.fillText('WIN 👑', goldenSlot.centerX, winY + 45)

  ctx.restore()
}

function draw3DMarble(ctx, b, player, radius, showLabels) {
  ctx.save()

  ctx.beginPath()
  ctx.arc(b.x + 2.5, b.y + 3.5, radius * 0.95, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.fill()

  const cx = b.x - radius * 0.3
  const cy = b.y - radius * 0.3
  const ballGrad = ctx.createRadialGradient(cx, cy, radius * 0.08, b.x, b.y, radius)

  ballGrad.addColorStop(0, '#ffffff')
  ballGrad.addColorStop(0.3, player.color)
  ballGrad.addColorStop(0.85, player.color)
  ballGrad.addColorStop(1, 'rgba(10, 5, 20, 0.85)')

  ctx.beginPath()
  ctx.arc(b.x, b.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = ballGrad
  ctx.fill()

  ctx.beginPath()
  ctx.arc(b.x, b.y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.32, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx - radius * 0.1, cy - radius * 0.1, radius * 0.12, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  if (showLabels) {
    ctx.font = '600 11px "Space Grotesk", sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = '#0a0514'
    ctx.shadowBlur = 4
    ctx.fillStyle = '#ffffff'
    ctx.fillText(player.name.slice(0, 10), b.x, b.y - radius - 5)
  }

  ctx.restore()
}

function draw3DCabinetBevel(ctx, width, height) {
  ctx.save()
  ctx.strokeStyle = '#5c477e'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, width - 6, height - 6)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, width - 2, height - 2)
  ctx.restore()
}
