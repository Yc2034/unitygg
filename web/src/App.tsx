/**
 * 大富翁4 - Main App Component
 */

import { useGameStore } from '@/stores/gameStore'
import { GameState } from '@/types'
import { Board, GameUI, MainMenu } from '@/components'

function App() {
  const { gameState, pauseGame, resumeGame } = useGameStore()

  // Main Menu
  if (gameState === GameState.MainMenu) {
    return <MainMenu />
  }

  // Game Screen
  return (
    <div style={styles.gameContainer}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <h1 style={styles.logo}>大富翁4</h1>
        <div style={styles.controls}>
          {gameState === GameState.Playing && (
            <button style={styles.controlButton} onClick={pauseGame}>
              暂停
            </button>
          )}
          {gameState === GameState.Paused && (
            <button style={styles.controlButton} onClick={resumeGame}>
              继续
            </button>
          )}
        </div>
      </div>

      {/* Main Game Area */}
      <div style={styles.mainArea}>
        {/* Board */}
        <div style={styles.boardContainer}>
          <Board />
        </div>

        {/* Side Panel */}
        <div style={styles.sidePanel}>
          <GameUI />
        </div>
      </div>

      {/* Pause Overlay */}
      {gameState === GameState.Paused && (
        <div style={styles.pauseOverlay}>
          <div style={styles.pauseModal}>
            <h2>游戏暂停</h2>
            <button style={styles.resumeButton} onClick={resumeGame}>
              继续游戏
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GameOver && <GameOverScreen />}
    </div>
  )
}

function GameOverScreen() {
  const { players } = useGameStore()

  // Find winner (the one not bankrupt)
  const winner = players.find((p) => p.state !== 'Bankrupt')

  const handleRestart = () => {
    window.location.reload()
  }

  return (
    <div style={styles.pauseOverlay}>
      <div style={styles.gameOverModal}>
        <h2 style={styles.gameOverTitle}>游戏结束!</h2>
        {winner && (
          <div style={styles.winnerInfo}>
            <p style={styles.winnerName}>{winner.name}</p>
            <p style={styles.winnerLabel}>获胜!</p>
            <p style={styles.winnerStats}>
              最终资产: ${winner.totalAssets.toLocaleString()}
            </p>
          </div>
        )}
        <button style={styles.restartButton} onClick={handleRestart}>
          重新开始
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  gameContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #333',
  },
  logo: {
    margin: 0,
    fontSize: '24px',
    color: '#4ecdc4',
    fontWeight: 'bold',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  controlButton: {
    padding: '8px 16px',
    backgroundColor: '#333',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  mainArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  boardContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
  },
  sidePanel: {
    width: '350px',
    borderLeft: '1px solid #333',
    overflow: 'hidden',
  },
  pauseOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pauseModal: {
    padding: '40px',
    backgroundColor: '#16213e',
    borderRadius: '16px',
    textAlign: 'center',
    color: '#fff',
  },
  resumeButton: {
    marginTop: '20px',
    padding: '12px 32px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  gameOverModal: {
    padding: '40px',
    backgroundColor: '#16213e',
    borderRadius: '16px',
    textAlign: 'center',
    color: '#fff',
    minWidth: '300px',
  },
  gameOverTitle: {
    margin: '0 0 20px 0',
    fontSize: '32px',
    color: '#ffe66d',
  },
  winnerInfo: {
    marginBottom: '20px',
  },
  winnerName: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4ecdc4',
    margin: '0 0 8px 0',
  },
  winnerLabel: {
    fontSize: '20px',
    color: '#fff',
    margin: '0 0 8px 0',
  },
  winnerStats: {
    fontSize: '16px',
    color: '#888',
    margin: 0,
  },
  restartButton: {
    padding: '12px 32px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
}

export default App
