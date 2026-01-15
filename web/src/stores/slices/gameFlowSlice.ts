/**
 * GameFlow Slice - 游戏状态、回合流转、骰子
 */

import {
  GameState,
  TurnState,
  PlayerState,
  PlayerData,
  TileData,
  TileType,
  PropertyFacility,
  CardData,
  DiceResult,
  GameConstants,
  DefaultCards,
  MapDefinitions,
} from '@/types'
import type { MapId, PropertyConfig } from '@/types'
import { generateId, calculateBoardPositions, calculateBoardPositionsFromGrid } from '@/utils/helpers'
import type { GameFlowSlice, SliceCreator, PlayerConfig } from './types'

// ============ Helper Functions ============

function createPlayer(
  config: PlayerConfig,
  _index: number,
  startingMoney: number,
  startPrevIndex: number | null
): PlayerData {
  return {
    id: generateId(),
    name: config.name,
    characterId: config.characterId,
    money: startingMoney,
    totalAssets: startingMoney,
    currentTileIndex: 0,
    lastTileIndex: startPrevIndex,
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

function createTiles(
  layout: Omit<TileData, 'position'>[],
  propertyConfigs: Record<number, PropertyConfig>,
  gridPositions?: Record<number, { x: number; y: number }>
): TileData[] {
  const positionMap = gridPositions ? calculateBoardPositionsFromGrid(gridPositions) : null
  const positions = gridPositions ? null : calculateBoardPositions(layout.length)
  return layout.map((tile, index) => {
    const tileData: TileData = {
      ...tile,
      position: positionMap?.[tile.index] ?? positions?.[index] ?? { x: 0, y: 0 },
    }

    // Add property data if it's a property tile
    if (tile.type === TileType.Property && propertyConfigs[tile.index]) {
      const config = propertyConfigs[tile.index]
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

function getMapDefinition(mapId?: MapId) {
  if (!mapId) return MapDefinitions[0]
  return MapDefinitions.find((map) => map.id === mapId) ?? MapDefinitions[0]
}

function createDefaultConnections(tileCount: number): Record<number, number[]> {
  const connections: Record<number, number[]> = {}
  for (let i = 0; i < tileCount; i++) {
    const prev = (i - 1 + tileCount) % tileCount
    const next = (i + 1) % tileCount
    connections[i] = [prev, next]
  }
  return connections
}

function createRandomCard(): CardData {
  const template = DefaultCards[Math.floor(Math.random() * DefaultCards.length)]
  return {
    ...template,
    id: generateId(),
  }
}

export const createGameFlowSlice: SliceCreator<GameFlowSlice> = (set, get) => ({
  // Initial state
  gameState: GameState.MainMenu,
  turnState: TurnState.WaitingForDice,
  turnNumber: 0,
  roundNumber: 0,
  lastDiceResult: null,
  forcedDiceValue: null,

  // ============ Game Flow Actions ============

  initGame: (playerConfigs, startingMoney = GameConstants.StartingMoney, mapId) => {
    if (
      playerConfigs.length < GameConstants.MinPlayers ||
      playerConfigs.length > GameConstants.MaxPlayers
    ) {
      console.error('Invalid number of players')
      return
    }

    const mapDefinition = getMapDefinition(mapId)
    const startPrevIndex = mapDefinition.startPrevIndex ?? mapDefinition.layout.length - 1
    const players = playerConfigs.map((config, index) =>
      createPlayer(config, index, startingMoney, startPrevIndex)
    )
    const tiles = createTiles(
      mapDefinition.layout,
      mapDefinition.propertyConfigs,
      mapDefinition.gridPositions
    )
    const tileConnections = mapDefinition.connections ?? createDefaultConnections(tiles.length)

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
      boardSize: tiles.length,
      tileConnections,
      shopCards,
      currentPlayerIndex: 0,
      turnNumber: 0,
      roundNumber: 0,
      loans: [],
      gameLog: [`游戏初始化完成 (${mapDefinition.name})`],
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
    const { getCurrentPlayer, decrementSkipTurns, addLog, endTurn, nextPlayer, turnNumber, clearPendingMove } = get()
    clearPendingMove()
    const player = getCurrentPlayer()
    if (!player) return

    // Check if player should skip turn
    if (player.turnsToSkip > 0) {
      decrementSkipTurns(player.id)
      addLog(`${player.name} 跳过本回合 (剩余 ${player.turnsToSkip - 1} 回合)`)
      endTurn()
      return
    }

    if (player.state === PlayerState.Bankrupt) {
      nextPlayer()
      return
    }

    set({ turnState: TurnState.WaitingForDice })
    addLog(`第 ${turnNumber} 回合 - ${player.name} 的回合`)
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
    const { players, currentPlayerIndex, checkWinCondition, endGame, addLog, startTurn, roundNumber } = get()

    // Check win condition
    const winnerId = checkWinCondition()
    if (winnerId) {
      endGame(winnerId)
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
      addLog(`=== 第 ${roundNumber + 1} 轮 ===`)
    }

    startTurn()
  },

  // ============ Dice Actions ============

  rollDice: () => {
    const { forcedDiceValue, addLog, getCurrentPlayer, startMove } = get()

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
    addLog(`掷出了 ${value} 点`)

    // 创建移动 Action 并推入队列
    const player = getCurrentPlayer()
    if (player) {
      startMove(player.id, value)
    }

    return result
  },

  setForcedDiceValue: (value) => {
    set({ forcedDiceValue: value })
  },

  // ============ Win Condition ============

  checkWinCondition: () => {
    const activePlayers = get().getActivePlayers()
    if (activePlayers.length === 1) {
      return activePlayers[0].id
    }
    return null
  },
})
