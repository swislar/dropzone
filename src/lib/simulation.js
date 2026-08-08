import Matter from 'matter-js'

const { Engine, World, Bodies, Body, Composite } = Matter

export class RaceSimulation {
  constructor(course, players) {
    this.course = course
    this.players = players
    this.engine = Engine.create()
    this.engine.gravity.y = 0.29
    this.world = this.engine.world

    this.elapsedMs = 0
    this.isReleased = false
    this.releaseTimeMs = null
    this.results = []
    this.firstFinishMs = null
    this.raceOver = false
    this.springFires = []
    this.topGateBlockers = []

    this._finishedIds = new Set()
    this._ballBodies = new Map()

    this.leftActiveBallId = null
    this.rightActiveBallId = null
    this.leftLastLaunchMs = 0
    this.rightLastLaunchMs = 0
    this.leftPlungerEmptyMs = 0
    this.rightPlungerEmptyMs = 0

    this._buildWalls()
    this._buildCapsule()
    this._buildBumpers()
    this._buildSlingshots()
    this._buildPegs()
    this._buildBalls()
  }

  _buildWalls() {
    const { width, height, tubeWidth, goldenSlot, pitFloorY } = this.course
    const thickness = 30
    const wallOpts = { isStatic: true, restitution: 0.45, friction: 0.02 }

    World.add(this.world, [
      // Continuous Outer Left & Right Boundary Walls
      Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 2, wallOpts),
      Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 2, wallOpts),

      // Continuous Vertical Tube Inner Walls (Ends at y = 640)
      Bodies.rectangle(tubeWidth, 385, 10, 500, wallOpts),
      Bodies.rectangle(width - tubeWidth, 385, 10, 500, wallOpts),
      Bodies.rectangle(tubeWidth + 8, 135, 12, 24, { ...wallOpts, angle: 0.55 }),
      Bodies.rectangle(width - (tubeWidth + 8), 135, 12, 24, { ...wallOpts, angle: -0.55 }),

      // Fully Symmetrical Top Curved Deflector Arches
      Bodies.rectangle(tubeWidth / 2 + 25, 35, 90, 16, { ...wallOpts, angle: -0.85 }),
      Bodies.rectangle(width - (tubeWidth / 2 + 25), 35, 90, 16, { ...wallOpts, angle: 0.85 }),

      // Bottom Launcher Floor Cups
      Bodies.rectangle(tubeWidth / 2, 748, tubeWidth + 10, 20, { ...wallOpts, restitution: 0.85 }),
      Bodies.rectangle(width - tubeWidth / 2, 748, tubeWidth + 10, 20, { ...wallOpts, restitution: 0.85 }),

      // DYNAMIC 1-TO-1 ALIGNED OUTWARD FUNNEL RAMPS (Adapts automatically to win slot width)
      Bodies.rectangle(
        (tubeWidth + goldenSlot.xMin) / 2,
        678,
        Math.hypot(goldenSlot.xMin - tubeWidth, -40),
        8,
        { ...wallOpts, angle: Math.atan2(-40, goldenSlot.xMin - tubeWidth), friction: 0.001, restitution: 0.4 }
      ),
      Bodies.rectangle(
        (width - tubeWidth + goldenSlot.xMax) / 2,
        678,
        Math.hypot(goldenSlot.xMax - (width - tubeWidth), -40),
        8,
        { ...wallOpts, angle: Math.atan2(-40, goldenSlot.xMax - (width - tubeWidth)), friction: 0.001, restitution: 0.4 }
      ),

      // SMOOTH THROAT GUIDE RAMPS
      Bodies.rectangle(36, 680, 44, 8, { ...wallOpts, angle: 0.45, friction: 0.001 }),
      Bodies.rectangle(width - 36, 680, 44, 8, { ...wallOpts, angle: -0.45, friction: 0.001 }),

      // SOLID UNDER-FUNNEL BARRIER SEALS
      Bodies.rectangle((tubeWidth + 20 + goldenSlot.xMin) / 2, 730, 240, 90, { ...wallOpts, friction: 0.02 }),
      Bodies.rectangle((width - (tubeWidth + 20) + goldenSlot.xMax) / 2, 730, 240, 90, { ...wallOpts, friction: 0.02 }),

      // Center Golden Slot Full-Height Pit Divider Posts (Height 115px, y = 660..775)
      Bodies.rectangle(goldenSlot.xMin - 4, 718, 8, 115, wallOpts),
      Bodies.rectangle(goldenSlot.xMax + 4, 718, 8, 115, wallOpts),

      // Bottom Pit Floor beneath Golden Win Slot
      Bodies.rectangle(width / 2, pitFloorY + thickness / 2, width + thickness * 2, thickness, {
        ...wallOpts,
        friction: 0.4,
        restitution: 0.25,
      }),
    ])
  }

  _buildCapsule() {
    const { capsule, pods, width } = this.course
    const opts = { isStatic: true, restitution: 0.4, friction: 0.05 }
    const thickness = 20

    const leftWall = Bodies.rectangle(capsule.x - thickness / 2, capsule.y + capsule.height / 2, thickness, capsule.height + 40, opts)
    const rightWall = Bodies.rectangle(capsule.x + capsule.width + thickness / 2, capsule.y + capsule.height / 2, thickness, capsule.height + 40, opts)
    const topCap = Bodies.rectangle(width / 2, capsule.y - thickness / 2, width, thickness, opts)

    World.add(this.world, [leftWall, rightWall, topCap])

    this.topGateBlockers = []
    if (pods && pods.length > 0) {
      for (const pod of pods) {
        const blocker = Bodies.rectangle(pod.centerX, pod.y + pod.height, pod.width + 2, 8, { ...opts, label: 'podGate' })
        this.topGateBlockers.push(blocker)
      }
      World.add(this.world, this.topGateBlockers)
    } else {
      const trapdoorW = capsule.width + 10
      const blocker = Bodies.rectangle(capsule.x + capsule.width / 2, capsule.trapdoorY, trapdoorW, capsule.trapdoorThickness, { ...opts, label: 'topGate' })
      this.topGateBlockers.push(blocker)
      World.add(this.world, blocker)
    }
  }

  _buildBumpers() {
    const bodies = this.course.bumpers.map((b) =>
      Bodies.circle(b.x, b.y, b.r, {
        isStatic: true,
        restitution: 1.35,
        friction: 0,
        label: 'popBumper',
      })
    )
    World.add(this.world, bodies)
  }

  _buildSlingshots() {
    const bodies = this.course.slingshots.map((s) =>
      Bodies.rectangle(s.x, s.y, s.width, s.height, {
        isStatic: true,
        angle: s.angle,
        restitution: 1.25,
        friction: 0,
        label: 'slingshot',
      })
    )
    World.add(this.world, bodies)
  }

  _buildPegs() {
    const bodies = this.course.pegs.map((p) =>
      Bodies.circle(p.x, p.y, p.r, {
        isStatic: true,
        restitution: 0.7,
        friction: 0.02,
        label: 'peg',
      })
    )
    World.add(this.world, bodies)
  }

  _buildBalls() {
    const { pods } = this.course
    const n = this.players.length
    const radius = Math.max(8, Math.min(13, 14 - n * 0.1))
    this.ballRadius = radius

    this.players.forEach((player, i) => {
      const pod = pods[i]
      const x = pod ? pod.centerX : this.course.width / 2
      const y = pod ? pod.centerY : 50

      const ball = Bodies.circle(x, y, radius, {
        restitution: 0.6,
        friction: 0.03,
        frictionAir: 0.0012,
        density: 0.0018,
        label: `ball:${player.id}`,
      })
      this._ballBodies.set(player.id, ball)
      World.add(this.world, ball)
    })
  }

  release() {
    if (this.isReleased) return
    this.isReleased = true
    this.releaseTimeMs = this.elapsedMs
    if (this.topGateBlockers && this.topGateBlockers.length > 0) {
      for (const blocker of this.topGateBlockers) {
        Composite.remove(this.world, blocker)
      }
      this.topGateBlockers = []
    }
  }

  step(deltaMs) {
    if (this.isReleased) {
      this.elapsedMs += deltaMs
    }

    Engine.update(this.engine, deltaMs)

    this.springFires = this.springFires.filter((sf) => this.elapsedMs - sf.timeMs < 450)

    const { tubeWidth, width, goldenSlot } = this.course

    // Check plunger occupancy
    let leftHasBall = false
    let rightHasBall = false
    for (const [, body] of this._ballBodies) {
      const bx = body.position.x
      const by = body.position.y
      if (bx <= tubeWidth + 10 && by >= 640) leftHasBall = true
      if (bx >= width - (tubeWidth + 10) && by >= 640) rightHasBall = true
    }

    if (leftHasBall) this.leftPlungerEmptyMs = this.elapsedMs
    if (rightHasBall) this.rightPlungerEmptyMs = this.elapsedMs

    const leftCanBoost = this.elapsedMs - this.leftPlungerEmptyMs >= 1000
    const rightCanBoost = this.elapsedMs - this.rightPlungerEmptyMs >= 1000

    for (const [id, body] of this._ballBodies) {
      if (this._finishedIds.has(id)) continue

      const bx = body.position.x
      const by = body.position.y

      // SMART CONDITIONAL BOOSTER (Triggers gentle nudge ONLY if plunger has been empty for >1.0s)
      if (leftCanBoost && bx <= goldenSlot.xMin && bx >= tubeWidth - 10 && by >= 630 && by <= 695) {
        if (body.velocity.x > -1.2) {
          Body.setVelocity(body, { x: -1.8, y: 0.27 })
        }
      }

      if (rightCanBoost && bx >= goldenSlot.xMax && bx <= width - (tubeWidth - 10) && by >= 630 && by <= 695) {
        if (body.velocity.x < 1.2) {
          Body.setVelocity(body, { x: 1.8, y: 0.27 })
        }
      }

      // ANTI-STACKING SINGLE-FILE QUEUE SEPARATION
      if (bx <= tubeWidth + 32 && bx >= tubeWidth - 10 && by >= 650 && by <= 695) {
        if (this.leftActiveBallId && this.leftActiveBallId !== id) {
          Body.setVelocity(body, { x: 0.8, y: -0.6 })
        }
      }

      if (bx >= width - (tubeWidth + 32) && bx <= width - (tubeWidth - 10) && by >= 650 && by <= 695) {
        if (this.rightActiveBallId && this.rightActiveBallId !== id) {
          Body.setVelocity(body, { x: -0.8, y: -0.6 })
        }
      }

      // 1. HIGH-POWER LEFT SPRING LAUNCHER
      if (bx <= tubeWidth + 6 && by >= 650) {
        if (!this.leftActiveBallId || this.leftActiveBallId === id) {
          if (this.elapsedMs - this.leftLastLaunchMs > 550) {
            this.leftActiveBallId = id
            this.leftLastLaunchMs = this.elapsedMs

            Body.setPosition(body, { x: tubeWidth / 2, y: 680 })
            Body.setVelocity(body, { x: 2.5, y: -24 })
            this.springFires.push({ side: 'left', timeMs: this.elapsedMs })
          }
        }
      }

      // Left Tube Smooth Re-Entry Transition
      if (bx <= tubeWidth + 12 && by <= 90 && body.velocity.y < 0) {
        Body.setPosition(body, { x: tubeWidth + 30, y: 70 })
        Body.setVelocity(body, { x: 3.5, y: 1.0 })
        this.leftActiveBallId = null
      }

      // 2. HIGH-POWER RIGHT SPRING LAUNCHER (vy = -24 for 50% speed cinematic launch)
      if (bx >= width - (tubeWidth + 6) && by >= 650) {
        if (!this.rightActiveBallId || this.rightActiveBallId === id) {
          if (this.elapsedMs - this.rightLastLaunchMs > 550) {
            this.rightActiveBallId = id
            this.rightLastLaunchMs = this.elapsedMs

            Body.setPosition(body, { x: width - tubeWidth / 2, y: 680 })
            Body.setVelocity(body, { x: -2.5, y: -24 })
            this.springFires.push({ side: 'right', timeMs: this.elapsedMs })
          }
        }
      }

      // Right Tube Smooth Re-Entry Transition
      if (bx >= width - (tubeWidth + 10) && by <= 90 && body.velocity.y < 0) {
        Body.setPosition(body, { x: width - (tubeWidth + 30), y: 70 })
        Body.setVelocity(body, { x: -3.5, y: 1.0 })
        this.rightActiveBallId = null
      }

      // 3. ENCLOSED 63px CENTER GOLDEN WIN PIT LANDED! 👑 (y >= 660)
      if (bx >= goldenSlot.xMin && bx <= goldenSlot.xMax && by >= goldenSlot.yMin) {
        this._finishedIds.add(id)
        this.results.push({ id, timeMs: this.elapsedMs })
      }
    }

    if (this.results.length >= 1 && this.firstFinishMs === null) {
      this.firstFinishMs = this.elapsedMs
    }

    const timeSinceFirstFinish = this.firstFinishMs !== null ? this.elapsedMs - this.firstFinishMs : 0
    const shouldFinishByTimer = this.firstFinishMs !== null && timeSinceFirstFinish >= 3500

    if (shouldFinishByTimer && !this.raceOver) {
      this.raceOver = true
    } else if (this.results.length === this.players.length && this.players.length > 0) {
      this.raceOver = true
    }

    return this.getSnapshot()
  }

  getSnapshot() {
    const balls = this.players.map((player) => {
      const body = this._ballBodies.get(player.id)
      return {
        id: player.id,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle,
        finished: this._finishedIds.has(player.id),
      }
    })

    const finishCountdown = this.firstFinishMs !== null
      ? Math.max(0, (3500 - (this.elapsedMs - this.firstFinishMs)) / 1000)
      : null

    return {
      elapsedMs: this.elapsedMs,
      isReleased: this.isReleased,
      releaseTimeMs: this.releaseTimeMs,
      balls,
      results: this.results,
      allFinished: this.raceOver,
      ballRadius: this.ballRadius,
      firstFinishMs: this.firstFinishMs,
      finishCountdown,
      springFires: this.springFires,
    }
  }

  destroy() {
    World.clear(this.world, false)
    Engine.clear(this.engine)
  }
}
