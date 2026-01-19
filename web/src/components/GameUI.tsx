/**
 * 大富翁4 - Game UI Component
 * HUD Layout: Player corners, Bottom action bar, Floating modals
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { TurnState, PlayerState, TileType, GameState, PropertyFacility, GameConstants } from '@/types'
import { formatCurrency, getPlayerColor } from '@/utils/helpers'
import { aiController } from '@/game/AIController'
import './GameUI.css'

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
    payResortFee,
    setCurrentEvent,
    setHasFreeUpgrade,
    calculateRent,
    getPropertyOwner,
    setPropertyFacility,
    pendingMove,
    chooseMoveDirection,
  } = useGameStore()

  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [showShop, setShowShop] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [rentInfo, setRentInfo] = useState<{ amount: number; ownerName: string } | null>(null)
  const [resortChoiceTileIndex, setResortChoiceTileIndex] = useState<number | null>(null)
  const [resortResult, setResortResult] = useState<{
    facility: PropertyFacility
    roll?: number
    amount?: number
    ownerName?: string
    stayTurns?: number
  } | null>(null)
  const [aiRunning, setAiRunning] = useState(false)
  const lastResolvedRef = useRef<string | null>(null)

  // Auto-scroll log
  const logEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameLog])

  const currentPlayer = getCurrentPlayer()
  const currentTile = currentPlayer ? tiles[currentPlayer.currentTileIndex] : null

  // AI Logic Hooks (kept same as before)
  useEffect(() => {
    if (
      gameState === GameState.Playing &&
      currentPlayer?.isAI &&
      !aiRunning &&
      (turnState === TurnState.WaitingForDice ||
        turnState === TurnState.OnTile ||
        turnState === TurnState.ChoosingDirection)
    ) {
      if (showEventModal) return
      setAiRunning(true)
      aiController.executeAITurn().finally(() => {
        setAiRunning(false)
      })
    }
  }, [gameState, turnState, currentPlayer?.isAI, currentPlayer?.id, showEventModal, aiRunning, pendingMove?.currentIndex])

  useEffect(() => {
    if (showEventModal && currentPlayer?.isAI) {
      const timer = setTimeout(() => {
        setShowEventModal(false)
        setCurrentEvent(null)
        setRentInfo(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [showEventModal, currentPlayer?.isAI])

  useEffect(() => {
    if (resortResult && currentPlayer?.isAI) {
      const timer = setTimeout(() => {
        setResortResult(null)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [resortResult, currentPlayer?.isAI])

  // Tile Event Handling (kept same)
  useEffect(() => {
    if (turnState !== TurnState.OnTile) {
      setRentInfo(null)
      setResortChoiceTileIndex(null)
      return
    }
    if (!currentPlayer || !currentTile) return

    const resolveKey = `${turnNumber}:${currentPlayer.id}:${currentTile.index}`
    if (lastResolvedRef.current === resolveKey) return
    lastResolvedRef.current = resolveKey

    setRentInfo(null)

    if ([TileType.News, TileType.Lottery, TileType.Chance, TileType.Fate].includes(currentTile.type)) {
      handleTileEvent(currentPlayer.id, currentTile.index)
      setShowEventModal(true)
      return
    }

    if (currentTile.type !== TileType.Property || !currentTile.propertyData) return

    const owner = getPropertyOwner(currentTile.index)
    const isOwner = owner?.id === currentPlayer.id
    const facility = currentTile.propertyData.facilityType
    const isResort = currentTile.propertyData.resortEnabled

    if (isOwner) {
      if (isResort && facility === PropertyFacility.None) {
        if (currentPlayer.isAI) {
          setPropertyFacility(currentTile.index, PropertyFacility.Hotel)
        } else {
          setResortChoiceTileIndex(currentTile.index)
        }
      }
      return
    }

    if (!owner || currentTile.propertyData.isMortgaged) return

    if (isResort) {
      if (facility === PropertyFacility.Park) {
        setResortResult({ facility: PropertyFacility.Park })
        return
      }
      if (facility === PropertyFacility.Hotel) {
        const roll = Math.floor(Math.random() * 6) + 1
        const amount = roll * GameConstants.HotelRentPerDay
        payResortFee(currentPlayer.id, currentTile.index, amount, roll, PropertyFacility.Hotel)
        setResortResult({ facility: PropertyFacility.Hotel, roll, amount, ownerName: owner.name, stayTurns: roll })
        return
      }
      if (facility === PropertyFacility.Mall) {
        const roll = Math.floor(Math.random() * 6) + 1
        const amount = roll * GameConstants.MallRentPerDay
        payResortFee(currentPlayer.id, currentTile.index, amount, 0, PropertyFacility.Mall)
        setResortResult({ facility: PropertyFacility.Mall, roll, amount, ownerName: owner.name })
        return
      }
    }

    const rent = calculateRent(currentTile.index)
    if (rent > 0) {
      setRentInfo({ amount: rent, ownerName: owner.name })
      payRent(currentPlayer.id, currentTile.index)
    }
  }, [turnState, currentPlayer?.id, currentTile?.index, turnNumber])

  // --- Actions ---
  const handleRollDice = () => rollDice()
  const handlePurchase = () => {
    if (!currentPlayer || !currentTile?.propertyData) return
    purchaseProperty(currentPlayer.id, currentTile.index)
    endTurn()
  }
  const handleUpgrade = () => {
    if (!currentTile?.propertyData) return
    upgradeProperty(currentTile.index)
    if (hasFreeUpgrade) setHasFreeUpgrade(false)
    endTurn()
  }
  const handleFreeUpgrade = () => {
    if (!currentPlayer || !hasFreeUpgrade) return
    const ownedProperties = tiles.filter(
      (t) => t.propertyData?.ownerId === currentPlayer.id && t.propertyData.level < 3 && !t.propertyData.resortEnabled
    )
    if (ownedProperties.length > 0) {
      const prop = ownedProperties[0]
      useGameStore.setState((state) => ({
        tiles: state.tiles.map((t) => t.index === prop.index ? { ...t, propertyData: { ...t.propertyData!, level: t.propertyData!.level + 1 } } : t),
      }))
      useGameStore.getState().addLog(`${currentPlayer.name} 免费升级了 ${prop.name}`)
    }
    setHasFreeUpgrade(false)
  }
  const handleUseCard = () => {
    if (!currentPlayer || !selectedCard) return
    const card = currentPlayer.cards.find((c) => c.id === selectedCard)
    if (card?.requiresTarget && !selectedTarget) return
    useCard(currentPlayer.id, selectedCard, selectedTarget || undefined)
    setSelectedCard(null)
    setSelectedTarget(null)
  }

  // --- UI Renders ---

  // HUD: Player Info Corners
  const renderPlayerHUD = () => (
    <>
      {players.map((player, index) => {
        const isCurrent = index === currentPlayerIndex
        const positionClass = ['top-left', 'top-right', 'bottom-right', 'bottom-left'][index] || 'top-left'

        return (
          <div key={player.id} className={`hud-player-card ${positionClass} ${isCurrent ? 'active' : ''}`}>
            <div className="player-avatar" style={{ borderColor: getPlayerColor(index).toString(16) }}>
              {/* Avatar Placeholder */}
            </div>
            <div className="player-info">
              <div className="player-name">{player.name}</div>
              <div className="player-cash">${formatCurrency(player.money)}</div>
              <div className="player-status">
                {player.state === PlayerState.InJail && '🔒'}
                {player.state === PlayerState.InHospital && '🏥'}
                {player.state === PlayerState.Bankrupt && '💸'}
                {isCurrent && '🎲'}
              </div>
            </div>
          </div>
        )
      })}
    </>
  )

  // HUD: Bottom Action Bar
  const renderActionBar = () => {
    if (gameState !== GameState.Playing || !currentPlayer) return null
    if (currentPlayer.isAI) return null // Hide controls for AI

    const canPurchase = currentTile?.propertyData && !currentTile.propertyData.ownerId && currentPlayer.money >= currentTile.propertyData.basePrice
    const canUpgrade = currentTile?.propertyData?.ownerId === currentPlayer.id && currentTile.propertyData.level < 3

    return (
      <div className="hud-action-bar">
        {/* Dice Button */}
        <div className="dice-control">
          <button
            className={`big-dice-btn ${turnState === TurnState.WaitingForDice ? 'pulse' : ''}`}
            onClick={handleRollDice}
            disabled={turnState !== TurnState.WaitingForDice}
          >
            🎲
          </button>
        </div>

        {/* Context Actions */}
        <div className="context-actions">
          {turnState === TurnState.OnTile && (
            <>
              <div className="tile-status">{currentTile?.name}</div>
              {canPurchase && <button className="action-btn buy" onClick={handlePurchase}>购买 ${currentTile!.propertyData!.basePrice}</button>}
              {canUpgrade && <button className="action-btn upgrade" onClick={handleUpgrade}>升级</button>}
              {hasFreeUpgrade && <button className="action-btn special" onClick={handleFreeUpgrade}>免费升级</button>}
              <button className="action-btn end" onClick={endTurn}>结束</button>
            </>
          )}
          {turnState === TurnState.ChoosingDirection && (
            <div className="direction-hint">请选择移动方向...</div>
          )}
        </div>

        {/* Card Hand */}
        <div className="card-hand">
          {currentPlayer.cards.map(card => (
            <div
              key={card.id}
              className={`hand-card ${selectedCard === card.id ? 'selected' : ''}`}
              onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
              title={card.description}
            >
              {card.name.substring(0, 1)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Floating Modals (Event, Shop, Resort)
  // ... (Simplified for brevity, but structurally center-screen)

  return (
    <div className="game-hud">
      {renderPlayerHUD()}
      {renderActionBar()}

      {/* Game Log (Bottom Left Overlay) */}
      <div className="hud-log">
        {gameLog.slice(-5).map((log, i) => <div key={i} className="log-line">{log}</div>)}
        <div ref={logEndRef} />
      </div>

      {/* Modals Container (Pointer Events Auto) */}
      <div className="hud-modals">
        {showEventModal && currentEvent && (
          <div className="modal-card event-modal">
            <h3>{currentEvent.title}</h3>
            <p>{currentEvent.description}</p>
            <button onClick={handleCloseEventModal}>确定</button>
          </div>
        )}

        {resortChoiceTileIndex !== null && (
          <div className="modal-card resort-modal">
            <h3>经营选择</h3>
            <div className="resort-options">
              <button onClick={() => handleSelectFacility(PropertyFacility.Park)}>公园</button>
              <button onClick={() => handleSelectFacility(PropertyFacility.Hotel)}>酒店</button>
              <button onClick={() => handleSelectFacility(PropertyFacility.Mall)}>商场</button>
            </div>
          </div>
        )}

        {/* Cards Selection Target Modal */}
        {selectedCard && currentPlayer?.cards.find(c => c.id === selectedCard)?.requiresTarget && (
          <div className="modal-card target-modal">
            <h3>选择目标</h3>
            {getActivePlayers().filter(p => p.id !== currentPlayer.id).map(p => (
              <button key={p.id} onClick={() => { setSelectedTarget(p.id); handleUseCard(); }}>{p.name}</button>
            ))}
            <button onClick={() => { setSelectedCard(null); setSelectedTarget(null); }}>取消</button>
          </div>
        )}

        {selectedCard && !currentPlayer?.cards.find(c => c.id === selectedCard)?.requiresTarget && (
          <div className="modal-card confirm-card-modal">
            <h3>使用 {currentPlayer?.cards.find(c => c.id === selectedCard)?.name}?</h3>
            <button onClick={handleUseCard}>确定</button>
            <button onClick={() => setSelectedCard(null)}>取消</button>
          </div>
        )}
      </div>
    </div>
  )
}
