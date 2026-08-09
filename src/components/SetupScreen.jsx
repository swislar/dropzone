import { useMemo, useState } from 'react'
import MarqueeTitle from './MarqueeTitle'
import ColorSwatch from './ColorSwatch'
import { colorForIndex } from '../lib/palette'
import { loadHallOfFame } from '../lib/storage'
import './setup-screen.css'

const MAX_PLAYERS = 50
const MEDALS = ['🥇', '🥈', '🥉']

export default function SetupScreen({ players, setPlayers, onStart, racesRun }) {
  const [name, setName] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [error, setError] = useState('')
  const [hallOfFame] = useState(() => loadHallOfFame(3))

  const remaining = MAX_PLAYERS - players.length
  const canAdd = remaining > 0
  const canStart = players.length >= 2

  function addPlayer(rawName) {
    const trimmed = rawName.trim()
    if (!trimmed || !canAdd) return
    const isDuplicate = players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
    if (isDuplicate) {
      setError(`"${trimmed}" already exists. Please enter a unique name.`)
      return
    }
    setError('')
    setPlayers((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed, color: colorForIndex(prev.length) },
    ])
  }

  function handleSubmit(e) {
    e.preventDefault()
    addPlayer(name)
    setName('')
  }

  function handleBulkAdd() {
    const existingLower = new Set(players.map((p) => p.name.toLowerCase()))
    const uniqueNewNames = []
    const parsed = bulkText.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)

    let dupCount = 0
    for (const n of parsed) {
      if (uniqueNewNames.length >= remaining) break
      const lower = n.toLowerCase()
      if (!existingLower.has(lower)) {
        existingLower.add(lower)
        uniqueNewNames.push(n)
      } else {
        dupCount++
      }
    }

    if (dupCount > 0) {
      setError(`Skipped ${dupCount} duplicate name(s). Please enter unique names.`)
    } else {
      setError('')
    }

    setPlayers((prev) => [
      ...prev,
      ...uniqueNewNames.map((n, i) => ({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        name: n,
        color: colorForIndex(prev.length + i),
      })),
    ])
    setBulkText('')
    setBulkOpen(false)
  }

  function updateColor(id, color) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, color } : p)))
  }

  function removePlayer(id) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  function shuffleColors() {
    setPlayers((prev) => {
      const shuffledIdx = [...prev.keys()]
      for (let i = shuffledIdx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledIdx[i], shuffledIdx[j]] = [shuffledIdx[j], shuffledIdx[i]]
      }
      return prev.map((p, i) => ({ ...p, color: colorForIndex(shuffledIdx[i]) }))
    })
  }

  function clearAll() {
    setPlayers([])
  }

  const counterTone = useMemo(() => {
    if (remaining === 0) return 'full'
    if (remaining <= 5) return 'low'
    return 'ok'
  }, [remaining])

  return (
    <div className="setup screen-in">
      <div className="setup__hero">
        <MarqueeTitle />
        {racesRun > 0 && (
          <p className="setup__stat">🎟️ {racesRun} race{racesRun === 1 ? '' : 's'} dropped so far on this device</p>
        )}
        {hallOfFame.length > 0 && (
          <div className="setup__hof">
            <span className="setup__hofLabel">HALL OF FAME</span>
            <div className="setup__hofList">
              {hallOfFame.map((entry, i) => (
                <span key={entry.name} className="setup__hofEntry">
                  {MEDALS[i]} {entry.name}
                  <span className="setup__hofWins">×{entry.wins}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="setup__panel">
        <form className="setup__add" onSubmit={handleSubmit}>
          <input
            className="setup__input"
            placeholder={canAdd ? 'Enter a name…' : 'Player list is full'}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            disabled={!canAdd}
            maxLength={24}
            aria-label="Player name"
          />
          <button className="btn btn--gold" type="submit" disabled={!canAdd || !name.trim()}>
            Add
          </button>
        </form>

        {error && <p className="setup__error">⚠️ {error}</p>}

        <div className="setup__toolbar">
          <button className="link-btn" type="button" onClick={() => setBulkOpen((o) => !o)}>
            {bulkOpen ? 'Hide bulk add' : '+ Paste a list'}
          </button>
          <div className={`setup__gauge setup__gauge--${counterTone}`} aria-hidden="true">
            <div className="setup__gaugeTrack">
              <div className="setup__gaugeFill" style={{ width: `${(players.length / MAX_PLAYERS) * 100}%` }} />
            </div>
            <span className="setup__counter">
              {players.length}/{MAX_PLAYERS}
            </span>
          </div>
        </div>

        {bulkOpen && (
          <div className="setup__bulk">
            <textarea
              className="setup__textarea"
              placeholder={'One name per line (or comma-separated)…'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
            />
            <button className="btn btn--teal" type="button" onClick={handleBulkAdd} disabled={!bulkText.trim()}>
              Add names
            </button>
          </div>
        )}

        {players.length === 0 ? (
          <div className="setup__empty">
            <p>No players yet. Add at least two names to start a drop.</p>
          </div>
        ) : (
          <>
            <ul className="setup__list">
              {players.map((p) => (
                <li key={p.id} className="setup__row">
                  <ColorSwatch color={p.color} onChange={(c) => updateColor(p.id, c)} label={p.name} />
                  <span className="setup__name">{p.name}</span>
                  <button
                    className="setup__remove"
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    aria-label={`Remove ${p.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="setup__listActions">
              <button className="link-btn" type="button" onClick={shuffleColors}>
                🎨 Shuffle colors
              </button>
              <button className="link-btn link-btn--danger" type="button" onClick={clearAll}>
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      <button className="btn btn--start" type="button" disabled={!canStart} onClick={onStart}>
        {canStart ? 'START THE DROP ▾' : 'Add at least 2 players'}
      </button>
    </div>
  )
}
