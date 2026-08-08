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
