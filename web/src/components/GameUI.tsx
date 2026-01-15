/**
 * 大富翁4 - Game UI Component
 * Player info, dice, cards, and action buttons
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { TurnState, PlayerState, TileType, GameState } from '@/types'
import { formatCurrency, getPlayerColor } from '@/utils/helpers'

export function GameUI() {
  const {
    gameState,
    turnState,
    players,
    currentPlayerIndex,
    turnNumber,
    roundNumber,
    lastDiceResult,
    gameLog,
    tiles,
    shopCards,
    currentEvent,
    hasFreeUpgrade,
    rollDice,
    endTurn,
    purchaseProperty,
    upgradeProperty,
    useCard,
    buyCard,
    getCurrentPlayer,
    getActivePlayers,
    handleTileEvent,
    payRent,
    setCurrentEvent,
    setHasFreeUpgrade,
    calculateRent,
    getPropertyOwner,
  } = useGameStore()

  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [showShop, setShowShop] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [rentInfo, setRentInfo] = useState<{ amount: number; ownerName: string } | null>(null)

  const currentPlayer = getCurrentPlayer()
  const currentTile = currentPlayer ? tiles[currentPlayer.currentTileIndex] : null

  // 处理踩到格子时的事件
  useEffect(() => {
    if (turnState === TurnState.OnTile && currentPlayer && currentTile) {
      // 处理特殊格子事件
      if (
        currentTile.type === TileType.News ||
        currentTile.type === TileType.Lottery ||
        currentTile.type === TileType.Chance ||
        currentTile.type === TileType.Fate
      ) {
        handleTileEvent(currentPlayer.id, currentTile.index)
        setShowEventModal(true)
      }

      // 处理他人地产租金
      if (currentTile.type === TileType.Property && currentTile.propertyData) {
        const owner = getPropertyOwner(currentTile.index)
        if (owner && owner.id !== currentPlayer.id && !currentTile.propertyData.isMortgaged) {
          const rent = calculateRent(currentTile.index)
          if (rent > 0) {
            setRentInfo({ amount: rent, ownerName: owner.name })
            payRent(currentPlayer.id, currentTile.index)
          }
        }
      }
    }
  }, [turnState, currentPlayer?.currentTileIndex])

  // Handle dice roll
  const handleRollDice = () => {
    if (turnState !== TurnState.WaitingForDice) return
    rollDice()
  }

  // Handle property purchase
  const handlePurchase = () => {
    if (!currentPlayer || !currentTile?.propertyData) return
    purchaseProperty(currentPlayer.id, currentTile.index)
    endTurn()
  }

  // Handle property upgrade
  const handleUpgrade = () => {
    if (!currentTile?.propertyData) return
    upgradeProperty(currentTile.index)
    if (hasFreeUpgrade) {
      setHasFreeUpgrade(false)
    }
    endTurn()
  }

  // Handle free upgrade (from chance card)
  const handleFreeUpgrade = () => {
    if (!currentPlayer || !hasFreeUpgrade) return
    // 找到玩家拥有的可升级地产
    const ownedProperties = tiles.filter(
      (t) =>
        t.propertyData?.ownerId === currentPlayer.id &&
        t.propertyData.level < 3
    )
    if (ownedProperties.length > 0) {
      // 升级第一个可升级的地产
      const prop = ownedProperties[0]
      if (prop.propertyData) {
        // 免费升级 - 直接修改等级而不扣钱
        useGameStore.setState((state) => ({
          tiles: state.tiles.map((t) =>
            t.index === prop.index
              ? {
                  ...t,
                  propertyData: { ...t.propertyData!, level: t.propertyData!.level + 1 },
                }
              : t
          ),
        }))
        useGameStore.getState().addLog(`${currentPlayer.name} 使用免费升级机会升级了 ${prop.name}`)
      }
    }
    setHasFreeUpgrade(false)
  }

  // Close event modal
  const handleCloseEventModal = () => {
    setShowEventModal(false)
    setCurrentEvent(null)
    setRentInfo(null)
  }

  // Handle card use
  const handleUseCard = () => {
    if (!currentPlayer || !selectedCard) return

    const card = currentPlayer.cards.find((c) => c.id === selectedCard)
    if (!card) return

    if (card.requiresTarget && !selectedTarget) {
      // Wait for target selection
      return
    }

    useCard(currentPlayer.id, selectedCard, selectedTarget || undefined)
    setSelectedCard(null)
    setSelectedTarget(null)
  }

  // Handle shop purchase
  const handleBuyShopCard = (index: number) => {
    if (!currentPlayer) return
    buyCard(currentPlayer.id, index)
  }

  // Render player info panel
  const renderPlayerInfo = () => (
    <div style={styles.playerPanel}>
      <h3 style={styles.panelTitle}>玩家</h3>
      {players.map((player, index) => {
        const color = `#${getPlayerColor(index).toString(16).padStart(6, '0')}`
        const isCurrentPlayer = index === currentPlayerIndex
        const isBankrupt = player.state === PlayerState.Bankrupt

        return (
          <div
            key={player.id}
            style={{
              ...styles.playerCard,
              borderColor: isCurrentPlayer ? color : '#333',
              opacity: isBankrupt ? 0.5 : 1,
            }}
          >
            <div style={styles.playerHeader}>
              <div
                style={{
                  ...styles.playerDot,
                  backgroundColor: color,
                }}
              />
              <span style={styles.playerName}>
                {player.name}
                {player.isAI && ' (AI)'}
                {isCurrentPlayer && ' ★'}
              </span>
            </div>
            <div style={styles.playerStats}>
              <div>现金: {formatCurrency(player.money)}</div>
              <div>资产: {formatCurrency(player.totalAssets)}</div>
              <div>地产: {player.ownedPropertyIndices.length} 处</div>
              <div>卡片: {player.cards.length} 张</div>
              {player.state !== PlayerState.Normal && (
                <div style={{ color: '#ff6b6b' }}>
                  {player.state === PlayerState.InJail && `监狱 (${player.turnsToSkip}回合)`}
                  {player.state === PlayerState.InHospital && `医院 (${player.turnsToSkip}回合)`}
                  {player.state === PlayerState.Bankrupt && '破产'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Render action panel
  const renderActionPanel = () => {
    if (gameState !== GameState.Playing || !currentPlayer) return null

    const canPurchase =
      currentTile?.type === TileType.Property &&
      currentTile.propertyData &&
      !currentTile.propertyData.ownerId &&
      currentPlayer.money >= currentTile.propertyData.basePrice

    const canUpgrade =
      currentTile?.type === TileType.Property &&
      currentTile.propertyData &&
      currentTile.propertyData.ownerId === currentPlayer.id &&
      currentTile.propertyData.level < 3

    return (
      <div style={styles.actionPanel}>
        <h3 style={styles.panelTitle}>行动</h3>

        {/* Dice */}
        <div style={styles.diceSection}>
          <button
            style={{
              ...styles.button,
              ...(turnState === TurnState.WaitingForDice ? styles.buttonPrimary : styles.buttonDisabled),
            }}
            onClick={handleRollDice}
            disabled={turnState !== TurnState.WaitingForDice}
          >
            掷骰子
          </button>
          {lastDiceResult && (
            <div style={styles.diceResult}>
              🎲 {lastDiceResult.total}
            </div>
          )}
        </div>

        {/* Tile Actions */}
        {turnState === TurnState.OnTile && currentTile && (
          <div style={styles.tileActions}>
            <div style={styles.tileInfo}>
              当前位置: {currentTile.name}
            </div>

            {/* 租金提示 */}
            {rentInfo && (
              <div style={styles.rentNotice}>
                向 {rentInfo.ownerName} 支付租金 {formatCurrency(rentInfo.amount)}
              </div>
            )}

            {canPurchase && (
              <button style={{ ...styles.button, ...styles.buttonSuccess }} onClick={handlePurchase}>
                购买 ({formatCurrency(currentTile.propertyData!.basePrice)})
              </button>
            )}

            {canUpgrade && (
              <button style={{ ...styles.button, ...styles.buttonSuccess }} onClick={handleUpgrade}>
                升级 (等级 {currentTile.propertyData!.level + 1})
              </button>
            )}

            {/* 免费升级按钮 */}
            {hasFreeUpgrade && currentPlayer && tiles.some(
              (t) => t.propertyData?.ownerId === currentPlayer.id && t.propertyData.level < 3
            ) && (
              <button style={{ ...styles.button, ...styles.buttonWarning }} onClick={handleFreeUpgrade}>
                使用免费升级
              </button>
            )}

            <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={endTurn}>
              结束回合
            </button>
          </div>
        )}

        {/* Cards */}
        {currentPlayer.cards.length > 0 && (
          <div style={styles.cardsSection}>
            <h4>手牌</h4>
            <div style={styles.cardsList}>
              {currentPlayer.cards.map((card) => (
                <div
                  key={card.id}
                  style={{
                    ...styles.card,
                    borderColor: selectedCard === card.id ? '#4ecdc4' : '#333',
                  }}
                  onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
                >
                  <div style={styles.cardName}>{card.name}</div>
                  <div style={styles.cardDesc}>{card.description}</div>
                </div>
              ))}
            </div>
            {selectedCard && (
              <div>
                {currentPlayer.cards.find((c) => c.id === selectedCard)?.requiresTarget && (
                  <select
                    style={styles.select}
                    value={selectedTarget || ''}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                  >
                    <option value="">选择目标</option>
                    {getActivePlayers()
                      .filter((p) => p.id !== currentPlayer.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                )}
                <button
                  style={{ ...styles.button, ...styles.buttonWarning }}
                  onClick={handleUseCard}
                >
                  使用卡片
                </button>
              </div>
            )}
          </div>
        )}

        {/* Shop Toggle - 只在商店格子显示 */}
        {turnState === TurnState.OnTile && currentTile?.type === TileType.Shop && (
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={() => setShowShop(!showShop)}
          >
            {showShop ? '关闭商店' : '打开商店'}
          </button>
        )}

        {/* Shop - 只在商店格子且打开时显示 */}
        {turnState === TurnState.OnTile && currentTile?.type === TileType.Shop && showShop && (
          <div style={styles.shopSection}>
            <h4>道具商店</h4>
            <div style={styles.shopCards}>
              {shopCards.map((card, index) => (
                <div key={card.id} style={styles.shopCard}>
                  <div style={styles.cardName}>{card.name}</div>
                  <div style={styles.cardDesc}>{card.description}</div>
                  <div style={styles.cardPrice}>{formatCurrency(card.price)}</div>
                  <button
                    style={{
                      ...styles.button,
                      ...(currentPlayer.money >= card.price
                        ? styles.buttonPrimary
                        : styles.buttonDisabled),
                    }}
                    onClick={() => handleBuyShopCard(index)}
                    disabled={currentPlayer.money < card.price}
                  >
                    购买
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render game log
  const renderGameLog = () => (
    <div style={styles.logPanel}>
      <h3 style={styles.panelTitle}>
        游戏日志 (第 {roundNumber} 轮 - 第 {turnNumber} 回合)
      </h3>
      <div style={styles.logList}>
        {gameLog.slice(-15).map((log, index) => (
          <div key={index} style={styles.logEntry}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )

  // Render event modal
  const renderEventModal = () => {
    if (!showEventModal || !currentEvent) return null

    const getEventColor = (type: string) => {
      switch (type) {
        case 'news':
          return '#3498db' // 蓝色
        case 'lottery':
          return '#f1c40f' // 金色
        case 'chance':
          return '#2ecc71' // 绿色
        case 'fate':
          return '#9b59b6' // 紫色
        default:
          return '#4ecdc4'
      }
    }

    const getEventTypeName = (type: string) => {
      switch (type) {
        case 'news':
          return '新闻'
        case 'lottery':
          return '彩票'
        case 'chance':
          return '机会'
        case 'fate':
          return '命运'
        default:
          return '事件'
      }
    }

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modal}>
          <div
            style={{
              ...styles.modalHeader,
              backgroundColor: getEventColor(currentEvent.type),
            }}
          >
            {getEventTypeName(currentEvent.type)}
          </div>
          <div style={styles.modalBody}>
            <h3 style={styles.eventTitle}>{currentEvent.title}</h3>
            <p style={styles.eventDescription}>{currentEvent.description}</p>
          </div>
          <button
            style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
            onClick={handleCloseEventModal}
          >
            确定
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {renderPlayerInfo()}
      {renderActionPanel()}
      {renderGameLog()}
      {renderEventModal()}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    width: '320px',
    height: '100%',
    overflowY: 'auto',
    backgroundColor: '#16213e',
    color: '#fff',
  },
  panelTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  playerPanel: {
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
  },
  playerCard: {
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#0f0f23',
    borderRadius: '4px',
    border: '2px solid #333',
  },
  playerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  playerDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
  },
  playerName: {
    fontWeight: 'bold',
    fontSize: '14px',
  },
  playerStats: {
    fontSize: '12px',
    color: '#aaa',
    lineHeight: '1.4',
  },
  actionPanel: {
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
  },
  diceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  diceResult: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffe66d',
  },
  tileActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  tileInfo: {
    fontSize: '14px',
    color: '#4ecdc4',
    marginBottom: '4px',
  },
  cardsSection: {
    marginTop: '12px',
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '8px',
  },
  card: {
    padding: '8px',
    backgroundColor: '#0f0f23',
    borderRadius: '4px',
    border: '2px solid #333',
    cursor: 'pointer',
  },
  cardName: {
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#ffe66d',
  },
  cardDesc: {
    fontSize: '10px',
    color: '#888',
  },
  cardPrice: {
    fontSize: '12px',
    color: '#4ecdc4',
    marginTop: '4px',
  },
  shopSection: {
    marginTop: '12px',
    padding: '8px',
    backgroundColor: '#0f0f23',
    borderRadius: '4px',
  },
  shopCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  shopCard: {
    padding: '8px',
    backgroundColor: '#16213e',
    borderRadius: '4px',
    border: '1px solid #333',
  },
  logPanel: {
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    flex: 1,
    minHeight: '200px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  logList: {
    flex: 1,
    overflowY: 'auto',
  },
  logEntry: {
    fontSize: '11px',
    color: '#888',
    padding: '2px 0',
    borderBottom: '1px solid #222',
  },
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  buttonSecondary: {
    backgroundColor: '#333',
    color: '#fff',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  buttonWarning: {
    backgroundColor: '#ff9800',
    color: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#222',
    color: '#666',
    cursor: 'not-allowed',
  },
  select: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#0f0f23',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '4px',
  },
  rentNotice: {
    padding: '8px',
    backgroundColor: '#ff6b6b',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
    textAlign: 'center',
    marginBottom: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    width: '300px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: '20px',
    textAlign: 'center',
  },
  eventTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    color: '#ffe66d',
  },
  eventDescription: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#ccc',
    lineHeight: '1.5',
  },
}
