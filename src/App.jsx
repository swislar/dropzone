import { useEffect, useState } from 'react'
import SetupScreen from './components/SetupScreen'
import PinballBoard from './components/PinballBoard'
import ResultsScreen from './components/ResultsScreen'
import AmbientBackground from './components/AmbientBackground'
import { loadSavedPlayers, savePlayers, loadStats, bumpRacesRun, recordWin } from './lib/storage'

// screen: 'setup' | 'race' | 'results'
export default function App() {
  const [screen, setScreen] = useState('setup')
  const [players, setPlayers] = useState(() => loadSavedPlayers() || [])
  const [seed, setSeed] = useState(() => Date.now())
  const [results, setResults] = useState([])
  const [muted, setMuted] = useState(false)
  const [racesRun, setRacesRun] = useState(() => loadStats().racesRun || 0)

  useEffect(() => {
    savePlayers(players)
  }, [players])

  function handleStart() {
    setSeed(Date.now())
    setScreen('race')
  }

  function handleFinished(ranked) {
    setResults(ranked)
    setRacesRun(bumpRacesRun().racesRun)
    if (ranked[0]) recordWin(ranked[0].name)
    setScreen('results')
  }

  function handleRaceAgain() {
    setSeed(Date.now())
    setScreen('race')
  }

  function handleNewPlayers() {
    setScreen('setup')
  }

  return (
    <div className="app">
      <AmbientBackground />

      <button
        className="mute-toggle"
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        title={muted ? 'Unmute sound' : 'Mute sound'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {screen === 'setup' && (
        <SetupScreen players={players} setPlayers={setPlayers} onStart={handleStart} racesRun={racesRun} />
      )}
      {screen === 'race' && (
        <PinballBoard players={players} seed={seed} muted={muted} onFinished={handleFinished} onReset={() => setScreen('setup')} />
      )}
      {screen === 'results' && (
        <ResultsScreen
          results={results}
          onRaceAgain={handleRaceAgain}
          onNewPlayers={handleNewPlayers}
          muted={muted}
        />
      )}
    </div>
  )
}
