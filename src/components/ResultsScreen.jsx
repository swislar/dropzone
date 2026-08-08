import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import MarqueeTitle from './MarqueeTitle'
import { playFanfare } from '../lib/sound'
import './results-screen.css'

export default function ResultsScreen({ results, onRaceAgain, onNewPlayers, muted }) {
  const [revealCount, setRevealCount] = useState(0)
  const winner = results[0]

  useEffect(() => {
    setRevealCount(0)
    if (!muted) playFanfare()
    const colors = [winner?.color || '#e8b33d', '#e8b33d', '#ffffff']
    const end = Date.now() + 900
    ;(function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    })()

    let i = 0
    const timer = setInterval(() => {
      i += 1
      setRevealCount(i)
      if (i >= results.length) clearInterval(timer)
    }, 140)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results])

  const podium = useMemo(() => results.slice(0, 3), [results])
  const rest = results.slice(3)

  return (
    <div className="results">
      <MarqueeTitle size="sm" />
      <p className="results__subtitle">Final rankings</p>

      {results.length > 0 ? (
        <>
          <div className="results__podium">
            {podium.map((p, i) => (
              <div key={p.id} className={`podium__spot podium__spot--${i + 1}`} style={{ '--pc': p.color }}>
                <div className="podium__ball">
                  <span className="podium__place">{i + 1}</span>
                </div>
                <div className="podium__name">{p.name}</div>
                <div className="podium__bar" />
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <ol className="results__list" start={4}>
              {rest.map((p, idx) => (
                <li
                  key={p.id}
                  className={`results__row ${idx + 3 < revealCount ? 'is-revealed' : ''}`}
                  style={{ '--pc': p.color, transitionDelay: `${idx * 0.02}s` }}
                >
                  <span className="results__place">{p.place}</span>
                  <span className="results__dot" />
                  <span className="results__name">{p.name}</span>
                  <span className="results__time">{(p.timeMs / 1000).toFixed(1)}s</span>
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="results__empty-msg">
          ⚠️ No balls reached the Golden Win Slot this round!
        </div>
      )}

      <div className="results__actions">
        <button className="btn btn--start" type="button" onClick={onRaceAgain}>
          RACE AGAIN ↻
        </button>
        <button className="link-btn" type="button" onClick={onNewPlayers}>
          Edit players
        </button>
      </div>
    </div>
  )
}
