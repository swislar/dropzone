const PLAYERS_KEY = 'dropzone.players.v1'
const STATS_KEY = 'dropzone.stats.v1'

export function loadSavedPlayers() {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function savePlayers(players) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
  } catch {
    // storage unavailable (private mode, quota, etc.) — fail silently
  }
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { racesRun: 0 }
    return JSON.parse(raw)
  } catch {
    return { racesRun: 0 }
  }
}

export function bumpRacesRun() {
  const stats = loadStats()
  const next = { ...stats, racesRun: (stats.racesRun || 0) + 1 }
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

const HOF_KEY = 'dropzone.hof.v1'

/** Records a win for a given player name — keyed case-insensitively so
 * "Alex" and "alex" tally together, but the most recent casing is kept
 * for display. */
export function recordWin(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return
  try {
    const raw = localStorage.getItem(HOF_KEY)
    const hof = raw ? JSON.parse(raw) : {}
    const key = trimmed.toLowerCase()
    const prevWins = hof[key]?.wins || 0
    hof[key] = { name: trimmed, wins: prevWins + 1 }
    localStorage.setItem(HOF_KEY, JSON.stringify(hof))
  } catch {
    // ignore
  }
}

/** Returns all recorded 1st place winners on this device, most wins first. */
export function loadHallOfFame(limit) {
  try {
    const raw = localStorage.getItem(HOF_KEY)
    if (!raw) return []
    const hof = JSON.parse(raw)
    const sorted = Object.values(hof).sort((a, b) => b.wins - a.wins)
    return limit ? sorted.slice(0, limit) : sorted
  } catch {
    return []
  }
}

/** Clears all recorded Hall of Fame data from localStorage. */
export function clearHallOfFame() {
  try {
    localStorage.removeItem(HOF_KEY)
  } catch {
    // ignore
  }
}

