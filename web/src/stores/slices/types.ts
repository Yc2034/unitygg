/**
 * Zustand Slice Pattern Type Definitions
 */

import type { StateCreator } from 'zustand'
import type {
  GameState,
  TurnState,
  PlayerData,
  TileData,
  CardData,
  DiceResult,
  LoanData,
  SpecialEvent,
  SpecialEventEffect,
  PropertyFacility,
  MapId,
} from '@/types'

// Player configuration for game initialization
export interface PlayerConfig {
  name: string
  characterId: string
  isAI: boolean
  aiDifficulty?: 'easy' | 'normal' | 'hard'
}

// ============ Slice Interfaces ============

export interface PlayerSlice {
  // State
  players: PlayerData[]
  currentPlayerIndex: number

  // Actions
  movePlayer: (playerId: string, steps: number) => void
  teleportPlayer: (playerId: string, tileIndex: number) => void
  addMoney: (playerId: string, amount: number) => void
  spendMoney: (playerId: string, amount: number) => boolean
  transferMoney: (fromId: string, toId: string, amount: number) => boolean
  sendToJail: (playerId: string, turns?: number) => void
  sendToHospital: (playerId: string, turns?: number) => void
  setBankrupt: (playerId: string) => void
  decrementSkipTurns: (playerId: string) => void

  // Getters
  getCurrentPlayer: () => PlayerData | null
  getPlayer: (id: string) => PlayerData | null
  getActivePlayers: () => PlayerData[]
}

export interface BoardSlice {
  // State
  tiles: TileData[]
  boardSize: number

  // Actions
  purchaseProperty: (playerId: string, tileIndex: number) => boolean
  upgradeProperty: (tileIndex: number) => boolean
  mortgageProperty: (tileIndex: number) => number
  redeemProperty: (tileIndex: number) => boolean
  calculateRent: (tileIndex: number) => number
  setPropertyFacility: (tileIndex: number, facility: PropertyFacility) => void
  payRent: (playerId: string, tileIndex: number) => boolean
  payResortFee: (
    playerId: string,
    tileIndex: number,
    amount: number,
    stayTurns: number,
    facility: PropertyFacility
  ) => boolean

  // Getters
  getTile: (index: number) => TileData | null
  getProperty: (index: number) => import('@/types').PropertyData | null
  getPropertyOwner: (tileIndex: number) => PlayerData | null
}

export interface GameFlowSlice {
  // State
  gameState: GameState
  turnState: TurnState
  turnNumber: number
  roundNumber: number
  lastDiceResult: DiceResult | null
  forcedDiceValue: number | null

  // Actions
  initGame: (playerConfigs: PlayerConfig[], startingMoney?: number, mapId?: MapId) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  endGame: (winnerId: string) => void
  startTurn: () => void
  endTurn: () => void
  setTurnState: (state: TurnState) => void
  nextPlayer: () => void
  rollDice: () => DiceResult
  setForcedDiceValue: (value: number | null) => void
  checkWinCondition: () => string | null
}

export interface CardSlice {
  // State
  shopCards: CardData[]

  // Actions
  addCard: (playerId: string, card: CardData) => boolean
  removeCard: (playerId: string, cardId: string) => void
  useCard: (playerId: string, cardId: string, targetId?: string) => boolean
  refreshShop: () => void
  buyCard: (playerId: string, cardIndex: number) => boolean
}

export interface BankSlice {
  // State
  loans: LoanData[]

  // Actions
  takeLoan: (playerId: string, amount: number) => boolean
  processLoans: () => void
}

export interface EventSlice {
  // State
  gameLog: string[]
  currentEvent: SpecialEvent | null
  hasFreeUpgrade: boolean

  // Actions
  addLog: (message: string) => void
  setCurrentEvent: (event: SpecialEvent | null) => void
  setHasFreeUpgrade: (value: boolean) => void
  handleTileEvent: (playerId: string, tileIndex: number) => SpecialEvent | null
  applyEventEffect: (playerId: string, effect: SpecialEventEffect) => void
}

// ============ Action Types ============

export type GameAction =
  | { type: 'MOVE'; playerId: string; path: number[]; passedStart?: boolean }
  | { type: 'TELEPORT'; playerId: string; fromIndex: number; toIndex: number }
  | { type: 'TO_JAIL'; playerId: string; jailIndex: number; turns: number }
  | { type: 'TO_HOSPITAL'; playerId: string; hospitalIndex: number; turns: number }
  | { type: 'BANKRUPT'; playerId: string }

export interface ActionSlice {
  // State
  actionQueue: GameAction[]
  currentAction: GameAction | null
  isProcessing: boolean

  // Queue Management
  pushAction: (action: GameAction) => void
  pushActions: (actions: GameAction[]) => void
  completeAction: () => void
  clearActions: () => void

  // Apply Action (Internal state update)
  applyAction: (action: GameAction) => void

  // Action Creators
  createMoveAction: (playerId: string, startIndex: number, steps: number) => GameAction
  createTeleportAction: (playerId: string, toIndex: number) => GameAction
  createToJailAction: (playerId: string, turns?: number) => GameAction
  createToHospitalAction: (playerId: string, turns?: number) => GameAction
  createBankruptAction: (playerId: string) => GameAction
}

// ============ Combined Store Type ============

export type GameStore = PlayerSlice &
  BoardSlice &
  GameFlowSlice &
  CardSlice &
  BankSlice &
  EventSlice &
  ActionSlice

// ============ Slice Creator Type ============

export type SliceCreator<T> = StateCreator<GameStore, [], [], T>
