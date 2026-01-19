/**
 * 大富翁4 - Game UI Component
 * Layout: Fullscreen Board + HUD overlays
 * Right Panel: Character Info + Minimap
 * Authentic Retro Dice Control
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { TurnState, PlayerState, TileType, GameState, PropertyFacility, GameConstants } from '@/types'
import { formatCurrency, getPlayerColor } from '@/utils/helpers'
import { aiController } from '@/game/AIController'
import './GameUI.css'
import { CHARACTER_OPTIONS } from '@/constants/characters'

type SidebarTab = 'funds' | 'properties' | 'stocks' | 'cards'

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

  // Sidebar State
  const [activeTab, setActiveTab] = useState<SidebarTab>('funds')

  // Dice Animation State
  const [isRolling, setIsRolling] = useState(false)
  const [displayDiceValue, setDisplayDiceValue] = useState(1)

  const lastResolvedRef = useRef<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [gameLog])

  const currentPlayer = getCurrentPlayer()
  const currentTile = currentPlayer ? tiles[currentPlayer.currentTileIndex] : null

  // AI Logic Hooks
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

      // Delay AI turn slightly if rolling animation is playing (though AI doesn't use UI roll)
      setTimeout(() => {
        aiController.executeAITurn().finally(() => {
          setAiRunning(false)
        })
      }, 500)
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

  // Tile Event Handling
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
  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    // Animation loop
    const interval = setInterval(() => {
      setDisplayDiceValue(Math.floor(Math.random() * 6) + 1);
    }, 50);

    // Stop after 500ms and execute logic
    setTimeout(() => {
      clearInterval(interval);
      const result = rollDice(); // This returns void in current store but updates state
      // We need to wait for state update to get the actual result, 
      // but since rollDice is sync in store, we can just grab it from next render or assume store update happens fast.
      // Actually, we can't easily get the *result* value here if rollDice doesn't return it.
      // But we can observe `lastDiceResult` in a useEffect if needed, 
      // OR we can just stop the animation on a random number and let the store source of truth update take over UI.
      setIsRolling(false);
    }, 500);
  }

  // Update display value when actual result comes in
  useEffect(() => {
    if (lastDiceResult && !isRolling) {
      setDisplayDiceValue(lastDiceResult.total);
    }
  }, [lastDiceResult, isRolling])


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

  const handleCloseResortResult = () => setResortResult(null)
  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setCurrentEvent(null);
    setRentInfo(null);
  }
  const handleBuyShopCard = (index: number) => {
    if (!currentPlayer) return;
    buyCard(currentPlayer.id, index);
  }

  // --- UI Renders ---

  const renderRightPanel = () => {
    if (!currentPlayer) return null;
    const characterConfig = CHARACTER_OPTIONS.find(c => c.id === currentPlayer.characterId);

    return (
      <div className="right-panel-column">
        <div className="character-info-section">
          <div className="sidebar-header">
            <div className="char-avatar-frame">
              {characterConfig?.image ? (
                <img src={characterConfig.image} alt={currentPlayer.name} className="char-img" />
              ) : (
                <div className="char-img-placeholder">{currentPlayer.name.substring(0, 1)}</div>
              )}
            </div>
            <div className="char-name-plate">
              <span className="char-name">{currentPlayer.name}</span>
            </div>
            <div className="char-status-bar" style={{ width: '80%', background: 'blue', height: '10px', margin: '5px auto' }}></div>
          </div>

          <div className="sidebar-body">
            <div className="sidebar-content-area">
              {activeTab === 'funds' && (
                <div className="info-tab-content funds">
                  <div className="info-row">
                    <span className="label">现金</span>
                    <span className="value cash">${formatCurrency(currentPlayer.money)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">存款</span>
                    <span className="value savings">$0</span>
                  </div>
                  <div className="separator"></div>
                  <div className="info-row">
                    <span className="label">总资产</span>
                    <span className="value total">${formatCurrency(currentPlayer.totalAssets)}</span>
                  </div>
                  <div className="info-footer-stats">
                    <div>点券: 0</div>
                    <div>物价指数: 1</div>
                  </div>
                </div>
              )}
              {activeTab === 'properties' && (
                <div className="info-tab-content properties">
                  <div className="info-list">
                    {currentPlayer.ownedPropertyIndices.length === 0 ? (
                      <div className="empty-msg">未拥有地产</div>
                    ) : (
                      tiles.filter(t => currentPlayer.ownedPropertyIndices.includes(t.index)).map(t => (
                        <div key={t.index} className="property-item-row">
                          <span>{t.name}</span>
                          <span>Lv.{t.propertyData?.level}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'stocks' && <div className="info-tab-content placeholder">股市暂未开放</div>}
              {activeTab === 'cards' && (
                <div className="info-tab-content cards-tab">
                  {currentPlayer.cards.length === 0 ? (
                    <div className="empty-msg">暂无卡片</div>
                  ) : (
                    <div className="sidebar-card-grid">
                      {currentPlayer.cards.map(card => (
                        <div
                          key={card.id}
                          className={`sidebar-card ${selectedCard === card.id ? 'selected' : ''}`}
                          onClick={() => setSelectedCard(card.id === selectedCard ? null : card.id)}
                          title={card.description}
                        >
                          <div className="card-icon">{card.name.substring(0, 1)}</div>
                          <div className="card-name">{card.name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-tabs">
              <button className={`tab-btn ${activeTab === 'funds' ? 'active' : ''}`} onClick={() => setActiveTab('funds')}>资<br />金</button>
              <button className={`tab-btn ${activeTab === 'properties' ? 'active' : ''}`} onClick={() => setActiveTab('properties')}>地<br />产</button>
              <button className={`tab-btn ${activeTab === 'stocks' ? 'active' : ''}`} onClick={() => setActiveTab('stocks')}>股<br />票</button>
              <button className={`tab-btn ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>卡<br />片</button>
            </div>
          </div>
        </div>

        <div className="minimap-section">
          <div className="minimap-container">
            <div className="minimap-placeholder">
              <span>MINI MAP</span>
              <div className="minimap-grid"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // HUD: Bottom Action Bar
  const renderActionBar = () => {
    if (gameState !== GameState.Playing || !currentPlayer) return null
    if (currentPlayer.isAI) return null

    const canPurchase = currentTile?.propertyData && !currentTile.propertyData.ownerId && currentPlayer.money >= currentTile.propertyData.basePrice
    const canUpgrade = currentTile?.propertyData?.ownerId === currentPlayer.id && currentTile.propertyData.level < 3

    return (
      <div className="hud-action-bar">
        {/* Retro Dice Control */}
        <div className="retro-dice-control">
          {/* The Purple Casing */}
          <div className="dice-casing">
            {/* The White Number Window */}
            <div className={`dice-window ${isRolling ? 'rolling' : ''}`}>
              <div className="dice-dot-display">
                {/* Simple dot representation or number */}
                {isRolling ? '?' : displayDiceValue}
              </div>
            </div>
          </div>

          {/* The Yellow GO Button */}
          <button
            className={`dice-go-btn ${turnState === TurnState.WaitingForDice ? 'active' : 'disabled'}`}
            onClick={handleRollDice}
            disabled={turnState !== TurnState.WaitingForDice || isRolling}
          >
            GO
          </button>
        </div>


        <div className="context-actions">
          {turnState === TurnState.OnTile && (
            <>
              <div className="tile-status">{currentTile?.name}</div>
              {rentInfo && <div className="rent-notice">支付租金: ${rentInfo.amount}</div>}

              {canPurchase && <button className="action-btn buy" onClick={handlePurchase}>购买 ${currentTile!.propertyData!.basePrice}</button>}
              {canUpgrade && <button className="action-btn upgrade" onClick={handleUpgrade}>升级</button>}
              {hasFreeUpgrade && <button className="action-btn special" onClick={handleFreeUpgrade}>免费升级</button>}

              {currentTile?.type === TileType.Shop && (
                <button className="action-btn shop" onClick={() => setShowShop(true)}>商店</button>
              )}

              <button className="action-btn end" onClick={endTurn}>结束</button>
            </>
          )}
          {turnState === TurnState.ChoosingDirection && pendingMove && (
            <div className="direction-selection">
              <div className="direction-hint">选择方向:</div>
              {pendingMove.options.map(targetIdx => (
                <button key={targetIdx} className="direction-btn" onClick={() => chooseMoveDirection(targetIdx)}>
                  {tiles.find(t => t.index === targetIdx)?.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card Hand removed - moved to sidebar */}
      </div>
    )
  }

  return (
    <div className="game-hud">
      {/* Right Column Layout */}
      {renderRightPanel()}
      {renderActionBar()}

      {/* Game Log */}
      <div className="hud-log">
        <div className="log-header">Round {roundNumber}</div>
        {gameLog.slice(-5).map((log, i) => <div key={i} className="log-line">{log}</div>)}
        <div ref={logEndRef} />
      </div>

      {/* Modals Container */}
      <div className="hud-modals">
        {showEventModal && currentEvent && (
          <div className="modal-card event-modal">
            <div className={`modal-header ${currentEvent.type}`}>{currentEvent.type}</div>
            <h3>{currentEvent.title}</h3>
            <p>{currentEvent.description}</p>
            <button onClick={handleCloseEventModal}>确定</button>
          </div>
        )}

        {resortChoiceTileIndex !== null && (
          <div className="modal-card resort-modal">
            <h3>经营选择</h3>
            <div className="resort-options">
              <button onClick={() => handleSelectFacility(PropertyFacility.Park)}>公园 (免租)</button>
              <button onClick={() => handleSelectFacility(PropertyFacility.Hotel)}>酒店 (高额)</button>
              <button onClick={() => handleSelectFacility(PropertyFacility.Mall)}>商场 (消费)</button>
            </div>
          </div>
        )}

        {resortResult && (
          <div className="modal-card resort-result-modal">
            <h3>{resortResult.facility === PropertyFacility.Park ? '公园' :
              resortResult.facility === PropertyFacility.Hotel ? '酒店入住' : '购物广场'}</h3>
            <div>
              {resortResult.facility === PropertyFacility.Park && '公园免租，心情舒畅！'}
              {resortResult.facility === PropertyFacility.Hotel && `摇到 ${resortResult.roll} 点，支付 ${formatCurrency(resortResult.amount || 0)} 并入住 ${resortResult.stayTurns} 天。`}
              {resortResult.facility === PropertyFacility.Mall && `购物消费 ${formatCurrency(resortResult.amount || 0)}。`}
            </div>
            <button onClick={handleCloseResortResult}>确定</button>
          </div>
        )}

        {showShop && currentPlayer && (
          <div className="modal-card shop-modal">
            <h3>道具商店 (现金: ${formatCurrency(currentPlayer.money)})</h3>
            <div className="shop-items-grid">
              {shopCards.map((card, idx) => (
                <div key={idx} className="shop-item">
                  <div className="shop-item-name">{card.name}</div>
                  <div className="shop-item-price">${card.price}</div>
                  <button
                    disabled={currentPlayer.money < card.price}
                    onClick={() => handleBuyShopCard(idx)}
                  >购买</button>
                </div>
              ))}
            </div>
            <button className="close-btn" onClick={() => setShowShop(false)}>离开</button>
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
