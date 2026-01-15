/**
 * 大富翁4 - Main Game Store
 * Zustand state management for the entire game
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  GameState,
  TurnState,
  PlayerState,
  PlayerData,
  TileData,
  PropertyData,
  CardData,
  DiceResult,
  LoanData,
  GameConstants,
  TileType,
  PropertyFacility,
  DefaultMapLayout,
  DefaultPropertyConfigs,
  DefaultCards,
  CardType,
  SpecialEvent,
  SpecialEventEffect,
  NewsEvents,
  LotteryEvents,
  ChanceEvents,
  FateEvents,
} from '@/types'
import { generateId, calculateBoardPositions } from '@/utils/helpers'

// ============ Store Types ============

interface GameStore {
  // Game state
  gameState: GameState
  turnState: TurnState
  currentPlayerIndex: number
  turnNumber: number
  roundNumber: number

  // Players
  players: PlayerData[]

  // Board
  tiles: TileData[]
  boardSize: number

  // Dice
  lastDiceResult: DiceResult | null
  forcedDiceValue: number | null

  // Cards
  shopCards: CardData[]

  // Bank
  loans: LoanData[]

  // Events/Messages
  gameLog: string[]

  // Actions - Game Flow
  initGame: (playerConfigs: PlayerConfig[]) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: (winnerId: string) => void

  // Actions - Turn System
  startTurn: () => void
  endTurn: () => void
  setTurnState: (state: TurnState) => void
  nextPlayer: () => void

  // Actions - Dice
  rollDice: () => DiceResult
  setForcedDiceValue: (value: number | null) => void

  // Actions - Player
  movePlayer: (playerId: string, steps: number) => void
  teleportPlayer: (playerId: string, tileIndex: number) => void
  addMoney: (playerId: string, amount: number) => void
  spendMoney: (playerId: string, amount: number) => boolean
  transferMoney: (fromId: string, toId: string, amount: number) => boolean
  sendToJail: (playerId: string, turns?: number) => void
  sendToHospital: (playerId: string, turns?: number) => void
  setBankrupt: (playerId: string) => void
  decrementSkipTurns: (playerId: string) => void

  // Actions - Property
  purchaseProperty: (playerId: string, tileIndex: number) => boolean
  upgradeProperty: (tileIndex: number) => boolean
  mortgageProperty: (tileIndex: number) => number
  redeemProperty: (tileIndex: number) => boolean
  calculateRent: (tileIndex: number) => number
  getPropertyOwner: (tileIndex: number) => PlayerData | null
  setPropertyFacility: (tileIndex: number, facility: PropertyFacility) => void

  // Actions - Cards
  addCard: (playerId: string, card: CardData) => boolean
  removeCard: (playerId: string, cardId: string) => void
  useCard: (playerId: string, cardId: string, targetId?: string) => boolean
  refreshShop: () => void
  buyCard: (playerId: string, cardIndex: number) => boolean

  // Actions - Bank
  takeLoan: (playerId: string, amount: number) => boolean
  processLoans: () => void

  // Actions - Log
  addLog: (message: string) => void

  // Actions - Special Events
  handleTileEvent: (playerId: string, tileIndex: number) => SpecialEvent | null
  applyEventEffect: (playerId: string, effect: SpecialEventEffect) => void

  // Actions - Rent
  payRent: (playerId: string, tileIndex: number) => boolean
  payResortFee: (
    playerId: string,
    tileIndex: number,
    amount: number,
    stayTurns: number,
    facility: PropertyFacility
  ) => boolean

  // Current special event (for UI display)
  currentEvent: SpecialEvent | null
  setCurrentEvent: (event: SpecialEvent | null) => void
  hasFreeUpgrade: boolean
  setHasFreeUpgrade: (value: boolean) => void

  // Getters
  getCurrentPlayer: () => PlayerData | null
  getPlayer: (id: string) => PlayerData | null
  getTile: (index: number) => TileData | null
  getProperty: (index: number) => PropertyData | null
  getActivePlayers: () => PlayerData[]
  checkWinCondition: () => string | null
}

export interface PlayerConfig {
  name: string
  characterId: string
  isAI: boolean
  aiDifficulty?: 'easy' | 'normal' | 'hard'
}

// ============ Helper Functions ============

function createPlayer(config: PlayerConfig, _index: number): PlayerData {
  return {
    id: generateId(),
    name: config.name,
    characterId: config.characterId,
    money: GameConstants.StartingMoney,
    totalAssets: GameConstants.StartingMoney,
    currentTileIndex: 0,
    state: PlayerState.Normal,
    turnsToSkip: 0,
    ownedPropertyIndices: [],
    cards: [],
    isAI: config.isAI,
    aiDifficulty: config.aiDifficulty,
    stats: {
      totalRentPaid: 0,
      totalRentReceived: 0,
      totalTilesPurchased: 0,
      timesPassedStart: 0,
    },
  }
}

function createTiles(): TileData[] {
  const positions = calculateBoardPositions(DefaultMapLayout.length)
  return DefaultMapLayout.map((tile, index) => {
    const tileData: TileData = {
      ...tile,
      position: positions[index],
    }

    // Add property data if it's a property tile
    if (tile.type === TileType.Property && DefaultPropertyConfigs[tile.index]) {
      const config = DefaultPropertyConfigs[tile.index]
      tileData.propertyData = {
        index: tile.index,
        name: tile.name,
        basePrice: config.basePrice,
        baseRent: config.baseRent,
        region: config.region,
        level: 0,
        ownerId: null,
        isMortgaged: false,
        facilityType: PropertyFacility.None,
        resortEnabled: config.resortEnabled ?? false,
        visualScale: config.visualScale ?? 1,
      }
    }

    return tileData
  })
}

function createRandomCard(): CardData {
  const template = DefaultCards[Math.floor(Math.random() * DefaultCards.length)]
  return {
    ...template,
    id: generateId(),
  }
}

// ============ Store Implementation ============

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    gameState: GameState.MainMenu,
    turnState: TurnState.WaitingForDice,
    currentPlayerIndex: 0,
    turnNumber: 0,
    roundNumber: 0,
    players: [],
    tiles: [],
    boardSize: GameConstants.DefaultBoardSize,
    lastDiceResult: null,
    forcedDiceValue: null,
    shopCards: [],
    loans: [],
    gameLog: [],
    currentEvent: null,
    hasFreeUpgrade: false,

    // ============ Game Flow Actions ============

    initGame: (playerConfigs) => {
      if (
        playerConfigs.length < GameConstants.MinPlayers ||
        playerConfigs.length > GameConstants.MaxPlayers
      ) {
        console.error('Invalid number of players')
        return
      }

      const players = playerConfigs.map((config, index) => createPlayer(config, index))
      const tiles = createTiles()

      // Give each player 2 random starting cards
      players.forEach((player) => {
        player.cards = [createRandomCard(), createRandomCard()]
      })

      // Initialize shop with 4 cards
      const shopCards = [createRandomCard(), createRandomCard(), createRandomCard(), createRandomCard()]

      set({
        gameState: GameState.Loading,
        players,
        tiles,
        shopCards,
        currentPlayerIndex: 0,
        turnNumber: 0,
        roundNumber: 0,
        loans: [],
        gameLog: ['游戏初始化完成'],
      })
    },

    startGame: () => {
      set({
        gameState: GameState.Playing,
        turnState: TurnState.WaitingForDice,
        turnNumber: 1,
        roundNumber: 1,
      })
      get().addLog('游戏开始!')
      get().startTurn()
    },

    pauseGame: () => {
      set({ gameState: GameState.Paused })
      get().addLog('游戏暂停')
    },

    resumeGame: () => {
      set({ gameState: GameState.Playing })
      get().addLog('游戏继续')
    },

    endGame: (winnerId) => {
      const winner = get().getPlayer(winnerId)
      set({ gameState: GameState.GameOver })
      get().addLog(`游戏结束! ${winner?.name || '未知'} 获胜!`)
    },

    // ============ Turn System Actions ============

    startTurn: () => {
      const player = get().getCurrentPlayer()
      if (!player) return

      // Check if player should skip turn
      if (player.turnsToSkip > 0) {
        get().decrementSkipTurns(player.id)
        get().addLog(`${player.name} 跳过本回合 (剩余 ${player.turnsToSkip - 1} 回合)`)
        get().endTurn()
        return
      }

      if (player.state === PlayerState.Bankrupt) {
        get().nextPlayer()
        return
      }

      set({ turnState: TurnState.WaitingForDice })
      get().addLog(`第 ${get().turnNumber} 回合 - ${player.name} 的回合`)
    },

    endTurn: () => {
      set({ turnState: TurnState.TurnEnd })
      get().processLoans()
      get().nextPlayer()
    },

    setTurnState: (state) => {
      set({ turnState: state })
    },

    nextPlayer: () => {
      const { players, currentPlayerIndex } = get()

      // Check win condition
      const winnerId = get().checkWinCondition()
      if (winnerId) {
        get().endGame(winnerId)
        return
      }

      // Find next active player
      let nextIndex = (currentPlayerIndex + 1) % players.length
      let attempts = 0

      while (players[nextIndex].state === PlayerState.Bankrupt && attempts < players.length) {
        nextIndex = (nextIndex + 1) % players.length
        attempts++
      }

      // Check if we completed a round
      const isNewRound = nextIndex <= currentPlayerIndex

      set((state) => ({
        currentPlayerIndex: nextIndex,
        turnNumber: state.turnNumber + 1,
        roundNumber: isNewRound ? state.roundNumber + 1 : state.roundNumber,
      }))

      if (isNewRound) {
        get().addLog(`=== 第 ${get().roundNumber} 轮 ===`)
      }

      get().startTurn()
    },

    // ============ Dice Actions ============

    rollDice: () => {
      const { forcedDiceValue } = get()

      let value: number
      if (forcedDiceValue !== null) {
        value = forcedDiceValue
        set({ forcedDiceValue: null })
      } else {
        value =
          Math.floor(Math.random() * (GameConstants.MaxDiceValue - GameConstants.MinDiceValue + 1)) +
          GameConstants.MinDiceValue
      }

      const result: DiceResult = {
        values: [value],
        total: value,
        isDoubles: false,
      }

      set({ lastDiceResult: result, turnState: TurnState.Rolling })
      get().addLog(`掷出了 ${value} 点`)

      return result
    },

    setForcedDiceValue: (value) => {
      set({ forcedDiceValue: value })
    },

    // ============ Player Actions ============

    movePlayer: (playerId, steps) => {
      const { boardSize } = get()

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p

          const oldIndex = p.currentTileIndex
          const newIndex = (oldIndex + steps) % boardSize

          // Check if passed start
          const passedStart = oldIndex + steps >= boardSize
          if (passedStart) {
            get().addLog(`${p.name} 经过起点，获得 ${GameConstants.SalaryOnPassStart} 元`)
          }

          return {
            ...p,
            currentTileIndex: newIndex,
            money: passedStart ? p.money + GameConstants.SalaryOnPassStart : p.money,
            stats: passedStart
              ? { ...p.stats, timesPassedStart: p.stats.timesPassedStart + 1 }
              : p.stats,
          }
        }),
      }))
    },

    teleportPlayer: (playerId, tileIndex) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, currentTileIndex: tileIndex } : p
        ),
      }))
    },

    addMoney: (playerId, amount) => {
      const { tiles } = get()
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p
          const newMoney = p.money + amount
          return {
            ...p,
            money: newMoney,
            totalAssets: newMoney + calculatePlayerPropertyValue(p.id, tiles),
          }
        }),
      }))
    },

    spendMoney: (playerId, amount) => {
      const player = get().getPlayer(playerId)
      if (!player || player.money < amount) return false

      const { tiles } = get()
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p
          const newMoney = p.money - amount
          return {
            ...p,
            money: newMoney,
            totalAssets: newMoney + calculatePlayerPropertyValue(p.id, tiles),
          }
        }),
      }))
      return true
    },

    transferMoney: (fromId, toId, amount) => {
      const from = get().getPlayer(fromId)
      if (!from || from.money < amount) return false

      get().spendMoney(fromId, amount)
      get().addMoney(toId, amount)
      return true
    },

    sendToJail: (playerId, turns = GameConstants.JailTurns) => {
      const jailTile = get().tiles.find((t) => t.type === TileType.Prison)
      if (!jailTile) return

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                state: PlayerState.InJail,
                turnsToSkip: turns,
                currentTileIndex: jailTile.index,
              }
            : p
        ),
      }))

      const player = get().getPlayer(playerId)
      get().addLog(`${player?.name} 被送入监狱，需要等待 ${turns} 回合`)
    },

    sendToHospital: (playerId, turns = GameConstants.HospitalTurns) => {
      const hospitalTile = get().tiles.find((t) => t.type === TileType.Hospital)
      if (!hospitalTile) return

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                state: PlayerState.InHospital,
                turnsToSkip: turns,
                currentTileIndex: hospitalTile.index,
              }
            : p
        ),
      }))

      const player = get().getPlayer(playerId)
      get().addLog(`${player?.name} 被送入医院，需要休息 ${turns} 回合`)
    },

    setBankrupt: (playerId) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                state: PlayerState.Bankrupt,
                money: 0,
              }
            : p
        ),
        // Clear all properties owned by bankrupt player
        tiles: state.tiles.map((t) =>
          t.propertyData?.ownerId === playerId
            ? {
                ...t,
                propertyData: {
                  ...t.propertyData,
                  ownerId: null,
                  level: 0,
                  facilityType: PropertyFacility.None,
                },
              }
            : t
        ),
      }))

      const player = get().getPlayer(playerId)
      get().addLog(`${player?.name} 破产了!`)
    },

    decrementSkipTurns: (playerId) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p
          const newTurns = Math.max(0, p.turnsToSkip - 1)
          return {
            ...p,
            turnsToSkip: newTurns,
            state: newTurns === 0 ? PlayerState.Normal : p.state,
          }
        }),
      }))
    },

    // ============ Property Actions ============

    purchaseProperty: (playerId, tileIndex) => {
      const tile = get().getTile(tileIndex)
      const player = get().getPlayer(playerId)

      if (!tile?.propertyData || !player) return false
      if (tile.propertyData.ownerId !== null) return false

      const price =
        tile.propertyData.basePrice *
        GameConstants.RegionMultipliers[tile.propertyData.region]

      if (player.money < price) return false

      get().spendMoney(playerId, price)

      set((state) => ({
        tiles: state.tiles.map((t) =>
          t.index === tileIndex
            ? {
                ...t,
                propertyData: { ...t.propertyData!, ownerId: playerId, level: 1 },
              }
            : t
        ),
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                ownedPropertyIndices: [...p.ownedPropertyIndices, tileIndex],
                stats: {
                  ...p.stats,
                  totalTilesPurchased: p.stats.totalTilesPurchased + 1,
                },
              }
            : p
        ),
      }))

      get().addLog(`${player.name} 购买了 ${tile.name}，花费 ${price} 元`)
      return true
    },

    upgradeProperty: (tileIndex) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData) return false

      const { ownerId, level, basePrice } = tile.propertyData
      if (!ownerId || level >= GameConstants.MaxPropertyLevel) return false

      const player = get().getPlayer(ownerId)
      if (!player) return false

      const upgradeCost = basePrice * level * 0.5

      if (player.money < upgradeCost) return false

      get().spendMoney(ownerId, upgradeCost)

      set((state) => ({
        tiles: state.tiles.map((t) =>
          t.index === tileIndex
            ? {
                ...t,
                propertyData: { ...t.propertyData!, level: level + 1 },
              }
            : t
        ),
      }))

      get().addLog(`${player.name} 升级了 ${tile.name} 到 ${level + 1} 级，花费 ${upgradeCost} 元`)
      return true
    },

    mortgageProperty: (tileIndex) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData || tile.propertyData.isMortgaged) return 0

      const { ownerId, basePrice, level, region } = tile.propertyData
      if (!ownerId) return 0

      const totalValue =
        basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
      const mortgageValue = totalValue * GameConstants.MortgageRate

      get().addMoney(ownerId, mortgageValue)

      set((state) => ({
        tiles: state.tiles.map((t) =>
          t.index === tileIndex
            ? {
                ...t,
                propertyData: { ...t.propertyData!, isMortgaged: true },
              }
            : t
        ),
      }))

      const player = get().getPlayer(ownerId)
      get().addLog(`${player?.name} 抵押了 ${tile.name}，获得 ${mortgageValue} 元`)

      return mortgageValue
    },

    redeemProperty: (tileIndex) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData || !tile.propertyData.isMortgaged) return false

      const { ownerId, basePrice, level, region } = tile.propertyData
      if (!ownerId) return false

      const player = get().getPlayer(ownerId)
      if (!player) return false

      const totalValue =
        basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
      const mortgageValue = totalValue * GameConstants.MortgageRate
      const redeemCost = mortgageValue * (1 + GameConstants.RedeemInterestRate)

      if (player.money < redeemCost) return false

      get().spendMoney(ownerId, redeemCost)

      set((state) => ({
        tiles: state.tiles.map((t) =>
          t.index === tileIndex
            ? {
                ...t,
                propertyData: { ...t.propertyData!, isMortgaged: false },
              }
            : t
        ),
      }))

      get().addLog(`${player.name} 赎回了 ${tile.name}，花费 ${redeemCost} 元`)
      return true
    },

    calculateRent: (tileIndex) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData) return 0

      const { baseRent, level, region, isMortgaged, facilityType, resortEnabled } =
        tile.propertyData
      if (isMortgaged || level === 0) return 0
      if (resortEnabled && facilityType !== PropertyFacility.None) return 0

      return (
        baseRent *
        GameConstants.RegionMultipliers[region] *
        GameConstants.RentMultipliers[level]
      )
    },

    getPropertyOwner: (tileIndex) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData?.ownerId) return null
      return get().getPlayer(tile.propertyData.ownerId)
    },

    setPropertyFacility: (tileIndex, facility) => {
      const tile = get().getTile(tileIndex)
      if (!tile?.propertyData || !tile.propertyData.ownerId) return

      set((state) => ({
        tiles: state.tiles.map((t) =>
          t.index === tileIndex
            ? {
                ...t,
                propertyData: { ...t.propertyData!, facilityType: facility },
              }
            : t
        ),
      }))

      const owner = get().getPlayer(tile.propertyData.ownerId)
      const facilityName =
        facility === PropertyFacility.Park
          ? '公园'
          : facility === PropertyFacility.Hotel
            ? '酒店'
            : facility === PropertyFacility.Mall
              ? '购物广场'
              : '空地'
      get().addLog(`${owner?.name} 将 ${tile.name} 设置为 ${facilityName}`)
    },

    // ============ Card Actions ============

    addCard: (playerId, card) => {
      const player = get().getPlayer(playerId)
      if (!player || player.cards.length >= GameConstants.MaxCardsInHand) return false

      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, cards: [...p.cards, card] } : p
        ),
      }))
      return true
    },

    removeCard: (playerId, cardId) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, cards: p.cards.filter((c) => c.id !== cardId) }
            : p
        ),
      }))
    },

    useCard: (playerId, cardId, targetId) => {
      const player = get().getPlayer(playerId)
      const card = player?.cards.find((c) => c.id === cardId)
      if (!player || !card) return false

      // Execute card effect based on type
      let success = false

      switch (card.type) {
        case CardType.Rob:
          if (targetId) {
            const target = get().getPlayer(targetId)
            if (target) {
              const amount = Math.min(target.money, 5000)
              get().transferMoney(targetId, playerId, amount)
              get().addLog(`${player.name} 使用抢劫卡，从 ${target.name} 抢走 ${amount} 元`)
              success = true
            }
          }
          break

        case CardType.Tax:
          const activePlayers = get().getActivePlayers()
          const totalMoney = activePlayers.reduce((sum, p) => sum + p.money, 0)
          const equalShare = Math.floor(totalMoney / activePlayers.length)

          set((state) => ({
            players: state.players.map((p) =>
              p.state !== PlayerState.Bankrupt ? { ...p, money: equalShare } : p
            ),
          }))

          get().addLog(`${player.name} 使用均贫卡，所有玩家现金平均分配为 ${equalShare} 元`)
          success = true
          break

        case CardType.Teleport:
          get().teleportPlayer(playerId, 0) // Teleport to start by default
          get().addLog(`${player.name} 使用传送卡`)
          success = true
          break

        case CardType.ControlDice:
          get().setForcedDiceValue(6) // Force max value
          get().addLog(`${player.name} 使用遥控骰子`)
          success = true
          break

        case CardType.Sleep:
          if (targetId) {
            const target = get().getPlayer(targetId)
            if (target) {
              set((state) => ({
                players: state.players.map((p) =>
                  p.id === targetId ? { ...p, turnsToSkip: p.turnsToSkip + 2 } : p
                ),
              }))
              get().addLog(`${player.name} 对 ${target.name} 使用催眠卡`)
              success = true
            }
          }
          break

        case CardType.Demolish:
          if (targetId) {
            const target = get().getPlayer(targetId)
            if (target) {
              // Find highest level property
              const targetProperties = get()
                .tiles.filter(
                  (t) => t.propertyData?.ownerId === targetId && t.propertyData.level > 0
                )
                .sort((a, b) => (b.propertyData?.level || 0) - (a.propertyData?.level || 0))

              if (targetProperties.length > 0) {
                const prop = targetProperties[0]
                set((state) => ({
                  tiles: state.tiles.map((t) =>
                    t.index === prop.index
                      ? {
                          ...t,
                          propertyData: {
                            ...t.propertyData!,
                            level: Math.max(0, (t.propertyData?.level || 0) - 1),
                          },
                        }
                      : t
                  ),
                }))
                get().addLog(
                  `${player.name} 对 ${target.name} 的 ${prop.name} 使用拆迁卡`
                )
                success = true
              }
            }
          }
          break

        default:
          get().addLog(`${player.name} 使用了 ${card.name}`)
          success = true
      }

      if (success) {
        get().removeCard(playerId, cardId)
      }

      return success
    },

    refreshShop: () => {
      set({
        shopCards: [
          createRandomCard(),
          createRandomCard(),
          createRandomCard(),
          createRandomCard(),
        ],
      })
    },

    buyCard: (playerId, cardIndex) => {
      const { shopCards } = get()
      const player = get().getPlayer(playerId)

      if (!player || cardIndex >= shopCards.length) return false

      const card = shopCards[cardIndex]
      if (player.money < card.price) return false
      if (player.cards.length >= GameConstants.MaxCardsInHand) return false

      get().spendMoney(playerId, card.price)
      get().addCard(playerId, { ...card, id: generateId() })

      // Replace bought card with new one
      set((state) => ({
        shopCards: state.shopCards.map((c, i) =>
          i === cardIndex ? createRandomCard() : c
        ),
      }))

      get().addLog(`${player.name} 购买了 ${card.name}`)
      return true
    },

    // ============ Bank Actions ============

    takeLoan: (playerId, amount) => {
      const player = get().getPlayer(playerId)
      if (!player) return false

      const existingLoans = get().loans.filter((l) => l.playerId === playerId)
      if (existingLoans.length >= GameConstants.MaxLoansPerPlayer) return false
      if (amount > GameConstants.MaxLoanAmount) return false

      const loan: LoanData = {
        id: generateId(),
        playerId,
        amount,
        remainingTurns: GameConstants.LoanTerm,
        interestRate: GameConstants.LoanInterestRate,
      }

      get().addMoney(playerId, amount)

      set((state) => ({
        loans: [...state.loans, loan],
      }))

      get().addLog(`${player.name} 从银行贷款 ${amount} 元`)
      return true
    },

    processLoans: () => {
      set((state) => ({
        loans: state.loans
          .map((loan) => {
            const player = get().getPlayer(loan.playerId)
            if (!player) return null

            const newRemaining = loan.remainingTurns - 1

            // Loan is due
            if (newRemaining <= 0) {
              const totalDue = loan.amount * (1 + loan.interestRate)

              if (player.money >= totalDue) {
                get().spendMoney(loan.playerId, totalDue)
                get().addLog(`${player.name} 还清贷款 ${totalDue} 元`)
              } else {
                get().setBankrupt(loan.playerId)
              }
              return null
            }

            return { ...loan, remainingTurns: newRemaining }
          })
          .filter((l): l is LoanData => l !== null),
      }))
    },

    // ============ Log Actions ============

    addLog: (message) => {
      set((state) => ({
        gameLog: [...state.gameLog.slice(-99), message],
      }))
    },

    // ============ Special Events ============

    setCurrentEvent: (event) => {
      set({ currentEvent: event })
    },

    setHasFreeUpgrade: (value) => {
      set({ hasFreeUpgrade: value })
    },

    handleTileEvent: (playerId, tileIndex) => {
      const tile = get().getTile(tileIndex)
      const player = get().getPlayer(playerId)
      if (!tile || !player) return null

      let events: Omit<SpecialEvent, 'id'>[] = []

      switch (tile.type) {
        case TileType.News:
          events = NewsEvents
          break
        case TileType.Lottery:
          events = LotteryEvents
          break
        case TileType.Chance:
          events = ChanceEvents
          break
        case TileType.Fate:
          events = FateEvents
          break
        default:
          return null
      }

      // 随机选择一个事件
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      const event: SpecialEvent = {
        ...randomEvent,
        id: generateId(),
      }

      get().addLog(`【${event.title}】${event.description}`)
      get().setCurrentEvent(event)

      // 新闻事件影响所有玩家
      if (tile.type === TileType.News) {
        get().getActivePlayers().forEach((p) => {
          get().applyEventEffect(p.id, event.effect)
        })
      } else {
        get().applyEventEffect(playerId, event.effect)
      }

      return event
    },

    applyEventEffect: (playerId, effect) => {
      const player = get().getPlayer(playerId)
      if (!player) return

      switch (effect.type) {
        case 'money':
          if (effect.amount > 0) {
            get().addMoney(playerId, effect.amount)
          } else if (effect.amount < 0) {
            const canPay = get().spendMoney(playerId, Math.abs(effect.amount))
            if (!canPay) {
              // 钱不够，破产
              get().setBankrupt(playerId)
            }
          }
          break

        case 'move':
          const { boardSize } = get()
          const newIndex = (player.currentTileIndex + effect.steps + boardSize) % boardSize
          get().teleportPlayer(playerId, newIndex)
          break

        case 'teleport':
          get().teleportPlayer(playerId, effect.tileIndex)
          // 如果传送到起点，给工资
          if (effect.tileIndex === 0) {
            get().addMoney(playerId, GameConstants.SalaryOnPassStart)
            get().addLog(`${player.name} 获得起点奖励 ${GameConstants.SalaryOnPassStart} 元`)
          }
          break

        case 'jail':
          get().sendToJail(playerId, effect.turns)
          break

        case 'hospital':
          get().sendToHospital(playerId, effect.turns)
          break

        case 'collectFromAll':
          const activePlayers = get().getActivePlayers()
          activePlayers.forEach((p) => {
            if (p.id !== playerId) {
              get().transferMoney(p.id, playerId, effect.amount)
            }
          })
          break

        case 'payToAll':
          const allPlayers = get().getActivePlayers()
          allPlayers.forEach((p) => {
            if (p.id !== playerId) {
              get().transferMoney(playerId, p.id, effect.amount)
            }
          })
          break

        case 'freeUpgrade':
          get().setHasFreeUpgrade(true)
          get().addLog(`${player.name} 获得一次免费升级机会`)
          break

        case 'skipTurn':
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId ? { ...p, turnsToSkip: p.turnsToSkip + effect.turns } : p
            ),
          }))
          break
      }
    },

    // ============ Rent Payment ============

    payRent: (playerId, tileIndex) => {
      const tile = get().getTile(tileIndex)
      const player = get().getPlayer(playerId)

      if (!tile?.propertyData || !player) return false

      const { ownerId, isMortgaged } = tile.propertyData

      // 检查是否是他人的地产且未抵押
      if (!ownerId || ownerId === playerId || isMortgaged) return false

      const owner = get().getPlayer(ownerId)
      if (!owner) return false

      const rent = get().calculateRent(tileIndex)
      if (rent <= 0) return false

      // 尝试支付租金
      if (player.money >= rent) {
        get().transferMoney(playerId, ownerId, rent)
        get().addLog(`${player.name} 向 ${owner.name} 支付租金 ${rent} 元 (${tile.name})`)

        // 更新统计
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, totalRentPaid: p.stats.totalRentPaid + rent } }
            }
            if (p.id === ownerId) {
              return { ...p, stats: { ...p.stats, totalRentReceived: p.stats.totalRentReceived + rent } }
            }
            return p
          }),
        }))

        return true
      } else {
        // 钱不够支付租金
        const actualPaid = player.money
        if (actualPaid > 0) {
          get().transferMoney(playerId, ownerId, actualPaid)
          get().addLog(`${player.name} 无法支付全额租金，仅支付 ${actualPaid} 元`)
        }
        get().setBankrupt(playerId)
        return false
      }
    },

    payResortFee: (playerId, tileIndex, amount, stayTurns, facility) => {
      const tile = get().getTile(tileIndex)
      const player = get().getPlayer(playerId)
      if (!tile?.propertyData || !player) return false

      const { ownerId, isMortgaged } = tile.propertyData
      if (!ownerId || ownerId === playerId || isMortgaged) return false

      const owner = get().getPlayer(ownerId)
      if (!owner) return false

      if (amount <= 0) return false

      const facilityName =
        facility === PropertyFacility.Hotel ? '酒店' : facility === PropertyFacility.Mall ? '购物广场' : '公园'

      const applyStay = (turns: number) => {
        if (turns <= 0) return
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, turnsToSkip: p.turnsToSkip + turns } : p
          ),
        }))
      }

      if (player.money >= amount) {
        get().transferMoney(playerId, ownerId, amount)
        get().addLog(`${player.name} 在 ${tile.name}${facilityName} 支付 ${amount} 元`)
        if (stayTurns > 0) {
          applyStay(stayTurns)
          get().addLog(`${player.name} 需要入住 ${stayTurns} 回合`)
        }

        set((state) => ({
          players: state.players.map((p) => {
            if (p.id === playerId) {
              return { ...p, stats: { ...p.stats, totalRentPaid: p.stats.totalRentPaid + amount } }
            }
            if (p.id === ownerId) {
              return {
                ...p,
                stats: { ...p.stats, totalRentReceived: p.stats.totalRentReceived + amount },
              }
            }
            return p
          }),
        }))

        return true
      }

      const actualPaid = player.money
      if (actualPaid > 0) {
        get().transferMoney(playerId, ownerId, actualPaid)
        get().addLog(`${player.name} 无法支付全额费用，仅支付 ${actualPaid} 元`)
      }
      get().setBankrupt(playerId)
      return false
    },

    // ============ Getters ============

    getCurrentPlayer: () => {
      const { players, currentPlayerIndex } = get()
      return players[currentPlayerIndex] || null
    },

    getPlayer: (id) => {
      return get().players.find((p) => p.id === id) || null
    },

    getTile: (index) => {
      return get().tiles.find((t) => t.index === index) || null
    },

    getProperty: (index) => {
      return get().getTile(index)?.propertyData || null
    },

    getActivePlayers: () => {
      return get().players.filter((p) => p.state !== PlayerState.Bankrupt)
    },

    checkWinCondition: () => {
      const activePlayers = get().getActivePlayers()
      if (activePlayers.length === 1) {
        return activePlayers[0].id
      }
      return null
    },
  }))
)

// Helper to calculate total property value for a player
function calculatePlayerPropertyValue(playerId: string, tiles: TileData[]): number {
  return tiles
    .filter((t) => t.propertyData?.ownerId === playerId)
    .reduce((sum, t) => {
      if (!t.propertyData) return sum
      const { basePrice, level, region } = t.propertyData
      return sum + basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
    }, 0)
}
