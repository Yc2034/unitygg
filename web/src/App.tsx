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
      {/* Board Layer (Fullscreen) */}
      <div style={styles.boardLayer}>
        <Board />
      </div>

      {/* UI Layer (Overlay) */}
      <div style={styles.uiLayer}>
        <GameUI />

        {/* Top Controls (Pause) */}
        <div style={styles.topControls}>
          {gameState === GameState.Playing && (
            <button style={styles.iconButton} onClick={pauseGame} title="暂停">
              ⏸
            </button>
          )}
          {gameState === GameState.Paused && (
            <button style={styles.iconButton} onClick={resumeGame} title="继续">
              ▶
            </button>
          )}
        </div>
      </div>

      {/* Overlays (Pause/Game Over) */}
      {gameState === GameState.Paused && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>游戏暂停</h2>
            <button style={styles.primaryButton} onClick={resumeGame}>
              继续游戏
            </button>
          </div>
        </div>
      )}

      {gameState === GameState.GameOver && <GameOverScreen />}
    </div>
  )
}

function GameOverScreen() {
  const { players } = useGameStore()
  const winner = players.find((p) => p.state !== 'Bankrupt')

  const handleRestart = () => {
    window.location.reload()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>游戏结束!</h2>
        {winner && (
          <div style={styles.winnerInfo}>
            <p style={styles.winnerName}>{winner.name}</p>
            <p>最终获胜!</p>
            <p style={styles.winnerStats}>
              总资产: ${winner.totalAssets.toLocaleString()}
            </p>
          </div>
        )}
        <button style={styles.primaryButton} onClick={handleRestart}>
          重新开始
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  gameContainer: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  boardLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  uiLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none', // Allow clicks to pass through to board where no UI exists
  },
  topControls: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    pointerEvents: 'auto',
  },
  iconButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.2s',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#2b3b6b',
    padding: '32px',
    borderRadius: '16px',
    border: '2px solid #fff',
    textAlign: 'center',
    color: '#fff',
    minWidth: '320px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '28px',
    color: '#fc0',
  },
  winnerInfo: {
    marginBottom: '24px',
    fontSize: '18px',
  },
  winnerName: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fc0',
    marginBottom: '8px',
  },
  winnerStats: {
    color: '#ddd',
    marginTop: '8px',
  },
  primaryButton: {
    padding: '12px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#d66',
    color: '#fff',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 0 #900',
  },
}

export default App
