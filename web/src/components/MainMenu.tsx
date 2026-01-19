/**
 * 大富翁4 - Main Menu Component
 * Refactored to match the classic layout
 */

import { useState } from 'react'
import { useGameStore, PlayerConfig } from '@/stores/gameStore'
import { GameConstants, MapDefinitions, MapId } from '@/types'
import { CHARACTER_OPTIONS } from '@/constants/characters'
import { STARTING_MONEY_OPTIONS } from '@/constants/menu'

const getCharacterName = (characterId: string) =>
  CHARACTER_OPTIONS.find((character) => character.id === characterId)?.name ?? '角色'

const createDefaultPlayerConfig = (index: number): PlayerConfig => ({
  characterId: CHARACTER_OPTIONS[index % CHARACTER_OPTIONS.length].id,
  name: CHARACTER_OPTIONS[index % CHARACTER_OPTIONS.length].name,
  isAI: index > 0,
  aiDifficulty: 'normal',
})

export function MainMenu() {
  const { initGame, startGame } = useGameStore()

  const [playerCount, setPlayerCount] = useState(4)
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    createDefaultPlayerConfig(0),
    createDefaultPlayerConfig(1),
    createDefaultPlayerConfig(2),
    createDefaultPlayerConfig(3),
  ])
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [startingMoney, setStartingMoney] = useState<number>(GameConstants.StartingMoney)
  const [selectedMapId, setSelectedMapId] = useState<MapId>(MapDefinitions[0]?.id ?? 'map1')

  const activePlayer = playerConfigs[activePlayerIndex]

  // Update active player config
  const handleSelectCharacter = (characterId: string) => {
    // Check if character is already taken by another player
    const isTaken = playerConfigs.some(
      (p, i) => i !== activePlayerIndex && i < playerCount && p.characterId === characterId
    )

    if (isTaken) {
      // Optional: Play error sound or shake
      return
    }

    setPlayerConfigs((prev) =>
      prev.map((config, i) =>
        i === activePlayerIndex
          ? { ...config, characterId, name: getCharacterName(characterId) }
          : config
      )
    )
  }

  const handleStartGame = () => {
    initGame(playerConfigs.slice(0, playerCount), startingMoney, selectedMapId)
    startGame()
  }

  return (
    <div style={styles.container}>
      <style>{commonCss}</style>

      {/* Background Layer to simulate the border/frame */}
      <div style={styles.frame}>

        {/* Top Section */}
        <div style={styles.topSection}>

          {/* Top Left: Character Selection */}
          <div style={styles.characterSection}>
            <div style={styles.characterGrid}>
              {CHARACTER_OPTIONS.slice(0, 12).map((character) => {
                const assignedPlayerIndex = playerConfigs.findIndex(
                  (p, i) => i < playerCount && p.characterId === character.id
                )
                const isSelected = assignedPlayerIndex !== -1
                const isCurrentActive = activePlayer?.characterId === character.id

                return (
                  <button
                    key={character.id}
                    className="retro-button character-cell"
                    style={{
                      ...styles.characterCell,
                      backgroundColor: character.image ? '#fff' : '#e0e0e0', // Fallback color
                      backgroundImage: character.image ? `url(${character.image})` : undefined,
                      backgroundSize: 'cover',
                      borderColor: isCurrentActive ? '#ff0000' : '#000',
                      borderWidth: isCurrentActive ? '3px' : '1px',
                    }}
                    onClick={() => handleSelectCharacter(character.id)}
                  >
                    {!character.image && <span>{character.name}</span>}
                    {isSelected && (
                      <div style={styles.playerBadge} className="player-badge">
                        P{assignedPlayerIndex + 1}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {/* Background pattern or texture can be added here */}
          </div>

          {/* Top Right: Map Selection */}
          <div style={styles.mapSection}>
            <div style={styles.mapList}>
              {MapDefinitions.map((map) => (
                <button
                  key={map.id}
                  className={`retro-button map-button ${selectedMapId === map.id ? 'active' : ''}`}
                  onClick={() => setSelectedMapId(map.id)}
                >
                  <div className="map-name">{map.name}</div>
                  {selectedMapId === map.id && <div className="checkmark">✔</div>}
                </button>
              ))}
              {/* Placeholders to fill the list like the screenshot */}
              <button className="retro-button map-button disabled">
                <div className="map-name">JAPAN</div>
              </button>
              <button className="retro-button map-button disabled">
                <div className="map-name">U.S.A</div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div style={styles.bottomSection}>

          {/* Bottom Left: Map Preview */}
          <div style={styles.previewSection}>
            {/* Large "TAIWAN" text or similar overlay */}
            <div style={styles.previewOverlay}>
              {MapDefinitions.find(m => m.id === selectedMapId)?.name.toUpperCase() || "MAP"}
            </div>
            {/* Actual image placeholder */}
            <div style={styles.previewImagePlaceholder}>
              (Map Preview Image)
            </div>
          </div>

          {/* Bottom Right: Settings */}
          <div style={styles.settingsSection}>

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button className="retro-button action-btn ok-btn" onClick={handleStartGame}>
                OK
              </button>
              <button className="retro-button action-btn exit-btn" onClick={() => window.close()}>
                EXIT
              </button>
            </div>

            {/* Settings Form */}
            <div style={styles.settingsForm}>

              {/* Player Count */}
              <div style={styles.formRow}>
                <label style={styles.label}>游戏人数</label>
                <div style={styles.selectWrapper}>
                  <select
                    value={playerCount}
                    onChange={(e) => setPlayerCount(Number(e.target.value))}
                    style={styles.select}
                  >
                    <option value={2}>二人</option>
                    <option value={3}>三人</option>
                    <option value={4}>四人</option>
                  </select>
                </div>
              </div>

              {/* Current Player Config (Who are we editing?) */}
              <div style={styles.formRow}>
                <label style={styles.label}>当前配置</label>
                <div style={styles.selectWrapper}>
                  <select
                    value={activePlayerIndex}
                    onChange={(e) => setActivePlayerIndex(Number(e.target.value))}
                    style={styles.select}
                  >
                    {Array.from({ length: playerCount }).map((_, i) => (
                      <option key={i} value={i}>
                        P{i + 1} {playerConfigs[i].name}
                        {playerConfigs[i].isAI ? ' (AI)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* AI Toggle for current player */}
              <div style={styles.formRow}>
                <label style={styles.label}>控制方式</label>
                <div style={styles.selectWrapper}>
                  <button
                    className="retro-button small-btn"
                    onClick={() => {
                      const newConfigs = [...playerConfigs];
                      newConfigs[activePlayerIndex].isAI = !newConfigs[activePlayerIndex].isAI;
                      setPlayerConfigs(newConfigs);
                    }}
                  >
                    {playerConfigs[activePlayerIndex].isAI ? '电脑' : '玩家'}
                  </button>
                </div>
              </div>

              {/* Starting Money */}
              <div style={styles.formRow}>
                <label style={styles.label}>总资金</label>
                <div style={styles.selectWrapper}>
                  <select
                    value={startingMoney}
                    onChange={(e) => setStartingMoney(Number(e.target.value))}
                    style={styles.select}
                  >
                    {STARTING_MONEY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Placeholders for visuals */}
              <div style={styles.formRow}>
                <label style={styles.label}>行进方式</label>
                <div style={styles.selectWrapper}>
                  <div style={styles.fakeValue}>步行</div>
                </div>
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>土地权限</label>
                <div style={styles.selectWrapper}>
                  <div style={styles.fakeValue}>无限期</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const commonCss = `
  @import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap');

  .retro-button {
    border: 2px solid #000;
    cursor: pointer;
    font-family: inherit;
    position: relative;
    box-shadow: 2px 2px 0px rgba(0,0,0,0.5);
    transition: all 0.1s;
  }
  .retro-button:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .retro-button.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(1);
  }

  .character-cell {
    border-radius: 8px;
    background-color: #ddd;
    overflow: hidden;
  }

  .player-badge {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: #FFD700;
    border: 1px solid #000;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #000;
    z-index: 10;
  }

  /* Map Button Styles */
  .map-button {
    width: 100%;
    height: 48px;
    background: linear-gradient(to bottom, #dedede, #999);
    border: 2px solid #555;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    margin-bottom: 8px;
  }
  .map-button.active {
    background: linear-gradient(to bottom, #eee, #ccc);
    border-color: #d00;
  }
  .map-name {
    font-weight: bold;
    color: #c00;
    font-size: 20px;
    text-shadow: 1px 1px 0 #fff;
    font-family: 'Ma Shan Zheng', cursive, serif; 
  }
  .checkmark {
    color: #d00;
    font-size: 24px;
    font-weight: bold;
  }

  /* Action Buttons */
  .action-btn {
    flex: 1;
    height: 40px;
    border-radius: 8px;
    font-size: 20px;
    font-weight: bold;
    color: #fff;
    text-shadow: 1px 1px 0 #000;
    font-style: italic;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ok-btn {
    background: linear-gradient(to bottom, #d66, #900);
    border: 2px solid #600;
    margin-right: 10px;
  }
  .exit-btn {
    background: linear-gradient(to bottom, #6d6, #090);
    border: 2px solid #060;
  }

  .small-btn {
    width: 100%;
    height: 100%;
    background: #ddd;
    font-size: 14px;
  }
`

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    userSelect: 'none',
  },
  frame: {
    width: '100%',
    height: '100%',
    maxWidth: '1024px',
    maxHeight: '768px',
    display: 'flex',
    flexDirection: 'column',
    border: '4px solid #gold', // Placeholder for fancy border
  },
  topSection: {
    height: '40%',
    display: 'flex',
    borderBottom: '4px solid #336699',
  },
  bottomSection: {
    height: '60%',
    display: 'flex',
  },
  characterSection: {
    width: '70%',
    backgroundColor: '#d8cba8', // Textured paper color
    padding: '10px',
    borderRight: '4px solid #336699',
    backgroundImage: 'radial-gradient(circle, #e8dba8 10%, #c8ba98 90%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '8px',
    width: '100%',
    height: '100%',
  },
  characterCell: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px', // Fallback font size
  },
  mapSection: {
    width: '30%',
    backgroundColor: '#2b3b6b', // Blue textured background
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderLeft: '2px solid #fff',
  },
  mapList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  previewSection: {
    width: '65%',
    backgroundColor: '#87CEEB', // Sky blue default
    position: 'relative',
    backgroundImage: 'url(/path/to/placeholder_map_bg.jpg)', // In real app
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRight: '4px solid #336699',
  },
  previewOverlay: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    fontSize: '60px',
    fontWeight: 'bold',
    color: 'rgba(0,0,0,0.1)',
    transform: 'rotate(-10deg)',
    pointerEvents: 'none',
  },
  previewImagePlaceholder: {
    color: '#fff',
    fontSize: '24px',
    textShadow: '0 0 4px #000',
  },
  settingsSection: {
    width: '35%',
    backgroundColor: '#2b3b6b', // Blue background
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '2px solid #fff',
  },
  actionButtons: {
    display: 'flex',
    marginBottom: '20px',
  },
  settingsForm: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#fff',
    fontSize: '18px',
    fontFamily: '"Ma Shan Zheng", serif', // Chinese font style
    textShadow: '1px 1px 2px #000',
    flex: 1,
  },
  selectWrapper: {
    width: '120px',
    height: '32px',
  },
  select: {
    width: '100%',
    height: '100%',
    fontSize: '16px',
    border: '2px solid #555',
    borderRadius: '4px',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  fakeValue: {
    width: '100%',
    height: '100%',
    backgroundColor: '#eee',
    border: '2px solid #555',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#555',
  },
}
