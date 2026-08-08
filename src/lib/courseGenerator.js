// Deterministic pseudo-random generator (mulberry32)
function mulberry32(seed) {
  let a = seed
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const BOARD_WIDTH = 680

const THEME_COLORS = [
  '#34e4c1', // Neon Teal
  '#00f0ff', // Electric Cyan
  '#ff3e7f', // Neon Magenta
  '#fbd671', // Vibrant Gold
  '#c084fc', // Pastel Lavender
  '#38ef7d', // Neon Lime
  '#ff7e5f', // Sunset Coral
  '#a78bfa', // Pastel Violet
]

/**
 * Builds a pinball machine layout with:
 * - Center Gatekeeper Bumper above Win Pit entry (y = 585) preventing straight-in drops
 * - Clean solid wing pentagons flanking the Golden Win Pit
 * - 63px Narrow Golden Win Slot 👑
 * - Extended Outward Bottom Funnel Ramps (264.5px length each)
 * - Horizontally Centered Starting Pod Boxes
 * - Random Neon/Pastel Color Theme per game
 */
export function generateCourse(seed = Date.now(), playerCount = 8) {
  const rand = mulberry32(seed)
  const W = BOARD_WIDTH
  const totalHeight = 800

  const themeColor = THEME_COLORS[Math.floor(rand() * THEME_COLORS.length)]
  const tubeWidth = 44

  // Top Glass Capsule Chamber
  const capsule = {
    x: tubeWidth + 20,
    y: 20,
    width: W - (tubeWidth + 20) * 2,
    height: 120,
    trapdoorY: 140,
    trapdoorThickness: 14,
  }

  // Calculate Horizontally Centered Pod Boxes for each row
  const cols = Math.min(playerCount, 8)
  const rows = Math.ceil(playerCount / cols)
  const podW = (capsule.width - 8) / cols
  const podH = (capsule.height - 8) / rows

  const pods = []
  for (let r = 0; r < rows; r++) {
    const isLastRow = r === rows - 1
    const itemsInRow = (isLastRow && playerCount % cols !== 0) ? (playerCount % cols) : cols
    const rowWidth = itemsInRow * podW
    const rowStartX = capsule.x + 4 + (capsule.width - 8 - rowWidth) / 2

    for (let c = 0; c < itemsInRow; c++) {
      const i = r * cols + c
      const px = rowStartX + c * podW
      const py = capsule.y + 4 + r * podH
      pods.push({
        id: i,
        x: px,
        y: py,
        width: podW,
        height: podH,
        centerX: px + podW / 2,
        centerY: py + podH / 2,
        trapdoorY: py + podH,
      })
    }
  }

  // Dynamic Pop Bumpers
  const bumpers = [
    { x: W * 0.5, y: 220, r: 26 },
    { x: W * 0.35, y: 315, r: 22 },
    { x: W * 0.65, y: 315, r: 22 },
    { x: W * 0.5, y: 420, r: 26 },
  ]

  // Side Slingshots
  const slingshots = [
    { x: tubeWidth + 85, y: 445, width: 14, height: 95, angle: 0.38 },
    { x: W - (tubeWidth + 85), y: 445, width: 14, height: 95, angle: -0.38 },
  ]

  // Pinball Pegs including center deflector post directly above Win Slot (y = 585)
  const pegRadius = 5.5
  const pegs = [
    { x: W * 0.5, y: 585, r: pegRadius }, // Small center deflector post above Win Pit
  ]
  const pegRows = 7
  const rowSpacing = 58
  const startY = 180
  const pegCols = 6
  const minX = tubeWidth + 70
  const maxX = W - (tubeWidth + 70)
  const colSpacing = (maxX - minX) / (pegCols - 1)

  for (let r = 0; r < pegRows; r++) {
    const y = startY + r * rowSpacing
    const isOdd = r % 2 === 1
    const rowCols = isOdd ? pegCols - 1 : pegCols
    const offset = isOdd ? colSpacing / 2 : 0

    for (let c = 0; c < rowCols; c++) {
      const x = minX + c * colSpacing + offset
      if (x < minX || x > maxX) continue

      let tooClose = false
      for (const b of bumpers) {
        if (Math.hypot(x - b.x, y - b.y) < b.r + pegRadius + 22) {
          tooClose = true
          break
        }
      }

      for (const s of slingshots) {
        if (Math.hypot(x - s.x, y - s.y) < 48) {
          tooClose = true
          break
        }
      }

      if (!tooClose) {
        const jitterX = (rand() - 0.5) * 3
        const jitterY = (rand() - 0.5) * 3
        pegs.push({ x: x + jitterX, y: y + jitterY, r: pegRadius })
      }
    }
  }

  // Left & Right Spring Launchers
  const leftLauncher = { x: tubeWidth / 2, y: 700, width: tubeWidth - 6 }
  const rightLauncher = { x: W - tubeWidth / 2, y: 700, width: tubeWidth - 6 }

  // 63px Narrow Center Golden Win Pit
  const winWidth = 63
  const goldenSlot = {
    xMin: W / 2 - winWidth / 2, // 308.5
    xMax: W / 2 + winWidth / 2, // 371.5
    centerX: W / 2,
    yMin: 654,
    yMax: 775,
    width: winWidth,
    height: 121,
  }

  const finishY = 720
  const pitFloorY = 775

  return {
    width: W,
    height: totalHeight,
    themeColor,
    tubeWidth,
    capsule,
    pods,
    bumpers,
    slingshots,
    pegs,
    funnelsY: 654,
    leftLauncher,
    rightLauncher,
    goldenSlot,
    finishY,
    pitFloorY,
    seed,
  }
}
