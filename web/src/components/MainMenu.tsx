/**
 * 大富翁4 - Main Menu Component
 */

import { useState } from 'react'
import { useGameStore, PlayerConfig } from '@/stores/gameStore'
import { GameConstants, MapDefinitions, MapId } from '@/types'
import xiaomeiImg from '@/assets/userimages/xiaomei.png'
import shalaImg from '@/assets/userimages/shala.png'
import beibeiImg from '@/assets/userimages/beibei.png'

const CHARACTER_OPTIONS = [
  { id: 'char1', name: '孙小美', image: xiaomeiImg },
  { id: 'char2', name: '阿土伯', image: shalaImg },
  { id: 'char3', name: '金贝贝', image: beibeiImg },
  { id: 'char4', name: '钱夫人' },
  { id: 'char5', name: '角色5' },
  { id: 'char6', name: '角色6' },
  { id: 'char7', name: '角色7' },
  { id: 'char8', name: '角色8' },
  { id: 'char9', name: '角色9' },
  { id: 'char10', name: '角色10' },
  { id: 'char11', name: '角色11' },
  { id: 'char12', name: '角色12' },
]

const STARTING_MONEY_OPTIONS = [30000, 50000, 100000] as const

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

  const [playerCount, setPlayerCount] = useState(2)
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    createDefaultPlayerConfig(0),
    createDefaultPlayerConfig(1),
  ])
  const [activePlayerIndex, setActivePlayerIndex] = useState(0)
  const [startingMoney, setStartingMoney] = useState(GameConstants.StartingMoney)
  const [selectedMapId, setSelectedMapId] = useState<MapId>(MapDefinitions[0]?.id ?? 'map1')

  const activePlayer = playerConfigs[activePlayerIndex]

  // Update player count
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count)
    setPlayerConfigs((prev) => {
      const nextConfigs: PlayerConfig[] = []
      for (let i = 0; i < count; i++) {
        nextConfigs.push(prev[i] ?? createDefaultPlayerConfig(i))
      }
      return nextConfigs
    })
    setActivePlayerIndex((prev) => Math.min(prev, count - 1))
  }

  // Update individual player config
  const updatePlayerConfig = (index: number, updates: Partial<PlayerConfig>) => {
    setPlayerConfigs((prev) =>
      prev.map((config, i) => (i === index ? { ...config, ...updates } : config))
    )
  }

  const handleSelectCharacter = (characterId: string) => {
    if (!activePlayer) return
    updatePlayerConfig(activePlayerIndex, { characterId, name: getCharacterName(characterId) })
  }

  // Start the game
  const handleStartGame = () => {
    initGame(playerConfigs.slice(0, playerCount), startingMoney, selectedMapId)
    startGame()
  }

  return (
    <div style={styles.container}>
      <style>{menuCss}</style>

      <div style={styles.backgroundGlow} className="menu-glow" />
      <div style={styles.backgroundGlowAlt} className="menu-glow" />

      <div style={styles.brandHeader}>
        <div>
          <div style={styles.title}>大富翁4</div>
          <div style={styles.subtitle}>RichMan 4 React Remake</div>
        </div>
        <div style={styles.tagline}>选择角色，配置人数与资金，然后开始游戏。</div>
      </div>

      <div className="main-menu__layout" style={styles.layout}>
        <section style={styles.rosterSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitle}>角色选择</div>
            <div style={styles.sectionHint}>
              当前配置：P{activePlayerIndex + 1} - {activePlayer?.name || '未选择'}
            </div>
          </div>

          <div className="main-menu__grid" style={styles.rosterGrid}>
            {CHARACTER_OPTIONS.map((character) => {
              const assignedPlayers = playerConfigs
                .map((config, index) => (config.characterId === character.id ? index : null))
                .filter((index): index is number => index !== null)

              const isActive = activePlayer?.characterId === character.id

              return (
                <button
                  key={character.id}
                  type="button"
                  className="menu-card"
                  style={{
                    ...styles.characterCard,
                    ...(isActive ? styles.characterCardActive : {}),
                  }}
                  onClick={() => handleSelectCharacter(character.id)}
                >
                  <div style={styles.characterMedia}>
                    {character.image ? (
                      <img src={character.image} alt={character.name} style={styles.characterImage} />
                    ) : (
                      <div style={styles.characterPlaceholder}>
                        <span>{character.name}</span>
                      </div>
                    )}
                    {assignedPlayers.length > 0 && (
                      <div style={styles.characterBadges}>
                        {assignedPlayers.map((index) => (
                          <span key={index} style={styles.characterBadge}>
                            P{index + 1}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={styles.characterName}>{character.name}</div>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="main-menu__panel" style={styles.controlsPanel}>
          <div style={styles.panelTitle}>游戏设置</div>

          <div style={styles.controlBlock}>
            <div style={styles.controlLabel}>地图</div>
            <div style={styles.chipRow}>
              {MapDefinitions.map((map) => (
                <button
                  key={map.id}
                  type="button"
                  className="menu-chip"
                  data-active={selectedMapId === map.id}
                  style={{
                    ...styles.chip,
                    ...(selectedMapId === map.id ? styles.chipActive : {}),
                  }}
                  onClick={() => setSelectedMapId(map.id)}
                >
                  {map.name}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.controlBlock}>
            <div style={styles.controlLabel}>游戏人数</div>
            <div style={styles.chipRow}>
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  className="menu-chip"
                  data-active={playerCount === count}
                  style={{
                    ...styles.chip,
                    ...(playerCount === count ? styles.chipActive : {}),
                  }}
                  onClick={() => handlePlayerCountChange(count)}
                >
                  {count}人
                </button>
              ))}
            </div>
          </div>

          <div style={styles.controlBlock}>
            <div style={styles.controlLabel}>玩家设置</div>
            <div style={styles.playerList}>
              {playerConfigs.map((config, index) => {
                const isActive = index === activePlayerIndex

                return (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    style={{
                      ...styles.playerRow,
                      ...(isActive ? styles.playerRowActive : {}),
                    }}
                    onClick={() => setActivePlayerIndex(index)}
                    onFocus={() => setActivePlayerIndex(index)}
                  >
                    <div style={styles.playerRowHeader}>
                      <div style={styles.playerBadge}>P{index + 1}</div>
                      <div style={styles.playerName}>{config.name}</div>
                      <label style={styles.aiToggle}>
                        <input
                          type="checkbox"
                          checked={config.isAI}
                          onChange={(e) => updatePlayerConfig(index, { isAI: e.target.checked })}
                        />
                        AI操控
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={styles.controlBlock}>
            <div style={styles.controlLabel}>总资金</div>
            <div style={styles.chipRow}>
              {STARTING_MONEY_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="menu-chip"
                  data-active={startingMoney === amount}
                  style={{
                    ...styles.chip,
                    ...(startingMoney === amount ? styles.chipActive : {}),
                  }}
                  onClick={() => setStartingMoney(amount)}
                >
                  {amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="menu-button"
            style={styles.startButton}
            onClick={handleStartGame}
          >
            开始游戏
          </button>

          <div style={styles.panelFooter}>
            起点奖励 +{GameConstants.SalaryOnPassStart.toLocaleString()}
          </div>
        </aside>
      </div>
    </div>
  )
}

const menuCss = `
  .main-menu__layout {
    display: grid;
    grid-template-columns: minmax(520px, 1fr) 340px;
    gap: 28px;
    align-items: start;
  }

  .main-menu__panel {
    justify-self: end;
    align-self: end;
  }

  .main-menu__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(110px, 1fr));
    gap: 12px;
  }

  .menu-card,
  .menu-chip,
  .menu-button {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }

  .menu-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 22px rgba(0, 0, 0, 0.35);
    border-color: var(--accent-2);
  }

  .menu-chip:hover {
    transform: translateY(-1px);
    border-color: var(--accent-2);
  }

  .menu-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.35);
  }

  .menu-glow {
    animation: glowPulse 10s ease-in-out infinite;
  }

  @keyframes glowPulse {
    0%, 100% {
      opacity: 0.55;
    }
    50% {
      opacity: 0.9;
    }
  }

  @media (max-width: 980px) {
    .main-menu__layout {
      grid-template-columns: 1fr;
    }
    .main-menu__panel {
      justify-self: stretch;
      align-self: start;
    }
  }

  @media (max-width: 720px) {
    .main-menu__grid {
      grid-template-columns: repeat(3, minmax(100px, 1fr));
    }
  }

  @media (max-width: 560px) {
    .main-menu__grid {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
    }
  }
`

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    height: '100vh',
    padding: '32px 32px 48px',
    position: 'relative',
    overflowY: 'auto',
    overflowX: 'hidden',
    background:
      'radial-gradient(1200px 800px at 10% 0%, rgba(61, 217, 198, 0.15), transparent 60%), radial-gradient(900px 600px at 90% 100%, rgba(246, 196, 83, 0.16), transparent 60%), linear-gradient(135deg, #0b0f1a, #111b2f)',
    color: 'var(--text)',
    fontFamily: '"Alegreya Sans", "Trebuchet MS", sans-serif',
    '--bg': '#0b0f1a',
    '--panel': '#131d30',
    '--panel-strong': '#1a243a',
    '--accent': '#f6c453',
    '--accent-2': '#3dd9c6',
    '--text': '#f5f1e8',
    '--muted': '#9aa4b2',
  } as React.CSSProperties,
  backgroundGlow: {
    position: 'absolute',
    width: '480px',
    height: '480px',
    top: '-120px',
    left: '-120px',
    background: 'radial-gradient(circle, rgba(61, 217, 198, 0.35), transparent 70%)',
    filter: 'blur(10px)',
    pointerEvents: 'none',
  },
  backgroundGlowAlt: {
    position: 'absolute',
    width: '520px',
    height: '520px',
    right: '-180px',
    bottom: '-200px',
    background: 'radial-gradient(circle, rgba(246, 196, 83, 0.35), transparent 70%)',
    filter: 'blur(12px)',
    pointerEvents: 'none',
  },
  brandHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '28px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: 'var(--accent)',
    textShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
    fontFamily: '"Cinzel", "Palatino Linotype", "Book Antiqua", serif',
  },
  subtitle: {
    marginTop: '6px',
    fontSize: '14px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--muted)',
  },
  tagline: {
    maxWidth: '320px',
    fontSize: '14px',
    lineHeight: 1.4,
    color: 'var(--muted)',
  },
  layout: {
    position: 'relative',
    zIndex: 1,
  },
  rosterSection: {
    padding: '20px 20px 24px',
    background: 'rgba(19, 29, 48, 0.85)',
    borderRadius: '18px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'baseline',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  sectionHint: {
    fontSize: '12px',
    color: 'var(--muted)',
  },
  rosterGrid: {
    marginTop: '8px',
  },
  characterCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '10px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(11, 15, 26, 0.65)',
    color: 'var(--text)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  characterCardActive: {
    borderColor: 'var(--accent)',
    boxShadow: '0 12px 26px rgba(246, 196, 83, 0.25)',
  },
  characterMedia: {
    position: 'relative',
    width: '100%',
    paddingTop: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'linear-gradient(160deg, rgba(61, 217, 198, 0.15), rgba(246, 196, 83, 0.08))',
  },
  characterImage: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  characterPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    fontSize: '12px',
    color: 'var(--muted)',
    textAlign: 'center',
    background: 'rgba(0, 0, 0, 0.25)',
  },
  characterName: {
    fontSize: '13px',
    fontWeight: 600,
  },
  characterBadges: {
    position: 'absolute',
    bottom: '6px',
    left: '6px',
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  characterBadge: {
    padding: '2px 6px',
    borderRadius: '999px',
    background: 'rgba(61, 217, 198, 0.9)',
    color: '#0b0f1a',
    fontSize: '10px',
    fontWeight: 700,
  },
  controlsPanel: {
    padding: '20px',
    borderRadius: '18px',
    background: 'rgba(13, 18, 32, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 18px 32px rgba(0, 0, 0, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  controlBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  controlLabel: {
    fontSize: '13px',
    color: 'var(--muted)',
    letterSpacing: '1px',
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  chip: {
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  chipActive: {
    background: 'var(--accent)',
    color: '#111b2f',
    borderColor: 'var(--accent)',
    boxShadow: '0 6px 14px rgba(246, 196, 83, 0.3)',
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  playerRow: {
    padding: '10px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(10, 14, 24, 0.65)',
    cursor: 'pointer',
  },
  playerRowActive: {
    borderColor: 'var(--accent-2)',
    boxShadow: '0 10px 20px rgba(61, 217, 198, 0.2)',
  },
  playerRowHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playerBadge: {
    background: 'rgba(61, 217, 198, 0.2)',
    color: 'var(--accent-2)',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
  },
  playerName: {
    flex: 1,
    color: 'var(--text)',
    fontSize: '13px',
    fontWeight: 600,
  },
  aiToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--muted)',
    marginLeft: 'auto',
  },
  startButton: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #f6c453, #f08a4b)',
    color: '#111b2f',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  panelFooter: {
    fontSize: '12px',
    color: 'var(--muted)',
    textAlign: 'right',
  },
}
