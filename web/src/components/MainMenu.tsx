/**
 * 大富翁4 - Main Menu Component
 */

import { useState } from 'react'
import { useGameStore, PlayerConfig } from '@/stores/gameStore'
import { GameConstants } from '@/types'

const CHARACTER_OPTIONS = [
  { id: 'char1', name: '孙小美' },
  { id: 'char2', name: '阿土伯' },
  { id: 'char3', name: '钱夫人' },
  { id: 'char4', name: '金贝贝' },
]

export function MainMenu() {
  const { initGame, startGame } = useGameStore()

  const [playerCount, setPlayerCount] = useState(2)
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    { name: '玩家1', characterId: 'char1', isAI: false },
    { name: '电脑1', characterId: 'char2', isAI: true, aiDifficulty: 'normal' },
  ])

  // Update player count
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)

    const newConfigs: PlayerConfig[] = []
    for (let i = 0; i < count; i++) {
      if (playerConfigs[i]) {
        newConfigs.push(playerConfigs[i])
      } else {
        newConfigs.push({
          name: i === 0 ? `玩家${i + 1}` : `电脑${i}`,
          characterId: CHARACTER_OPTIONS[i % CHARACTER_OPTIONS.length].id,
          isAI: i > 0,
          aiDifficulty: 'normal',
        })
      }
    }
    setPlayerConfigs(newConfigs)
  }

  // Update individual player config
  const updatePlayerConfig = (index: number, updates: Partial<PlayerConfig>) => {
    setPlayerConfigs((prev) =>
      prev.map((config, i) => (i === index ? { ...config, ...updates } : config))
    )
  }

  // Start the game
  const handleStartGame = () => {
    initGame(playerConfigs)
    startGame()
  }

  return (
    <div style={styles.container}>
      <div style={styles.menu}>
        <h1 style={styles.title}>大富翁4</h1>
        <h2 style={styles.subtitle}>RichMan 4</h2>

        <div style={styles.section}>
          <label style={styles.label}>玩家数量</label>
          <div style={styles.buttonGroup}>
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                style={{
                  ...styles.countButton,
                  ...(playerCount === count ? styles.countButtonActive : {}),
                }}
                onClick={() => handlePlayerCountChange(count)}
              >
                {count}人
              </button>
            ))}
          </div>
        </div>

        <div style={styles.playersSection}>
          {playerConfigs.map((config, index) => (
            <div key={index} style={styles.playerConfig}>
              <div style={styles.playerHeader}>
                <span style={styles.playerNumber}>P{index + 1}</span>
                <input
                  style={styles.nameInput}
                  value={config.name}
                  onChange={(e) => updatePlayerConfig(index, { name: e.target.value })}
                  placeholder="名称"
                />
              </div>

              <div style={styles.configRow}>
                <select
                  style={styles.select}
                  value={config.characterId}
                  onChange={(e) => updatePlayerConfig(index, { characterId: e.target.value })}
                >
                  {CHARACTER_OPTIONS.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name}
                    </option>
                  ))}
                </select>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={config.isAI}
                    onChange={(e) => updatePlayerConfig(index, { isAI: e.target.checked })}
                  />
                  电脑
                </label>
              </div>

              {config.isAI && (
                <select
                  style={styles.select}
                  value={config.aiDifficulty}
                  onChange={(e) =>
                    updatePlayerConfig(index, {
                      aiDifficulty: e.target.value as 'easy' | 'normal' | 'hard',
                    })
                  }
                >
                  <option value="easy">简单</option>
                  <option value="normal">普通</option>
                  <option value="hard">困难</option>
                </select>
              )}
            </div>
          ))}
        </div>

        <button style={styles.startButton} onClick={handleStartGame}>
          开始游戏
        </button>

        <div style={styles.info}>
          <p>初始资金: ${GameConstants.StartingMoney.toLocaleString()}</p>
          <p>经过起点: +${GameConstants.SalaryOnPassStart.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a2e',
  },
  menu: {
    padding: '40px',
    backgroundColor: '#16213e',
    borderRadius: '16px',
    textAlign: 'center',
    minWidth: '400px',
  },
  title: {
    margin: 0,
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#4ecdc4',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  },
  subtitle: {
    margin: '0 0 32px 0',
    fontSize: '18px',
    color: '#888',
    fontWeight: 'normal',
  },
  section: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#fff',
    fontSize: '14px',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
  },
  countButton: {
    padding: '10px 24px',
    border: '2px solid #333',
    borderRadius: '8px',
    backgroundColor: '#0f0f23',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  countButtonActive: {
    borderColor: '#4ecdc4',
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  playersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  playerConfig: {
    padding: '12px',
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  playerNumber: {
    padding: '4px 12px',
    backgroundColor: '#4ecdc4',
    borderRadius: '4px',
    color: '#000',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  nameInput: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
  },
  configRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  select: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#16213e',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px',
  },
  info: {
    color: '#666',
    fontSize: '12px',
    lineHeight: '1.6',
  },
}
