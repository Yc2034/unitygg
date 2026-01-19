/**
 * 大富翁4 - Core Types & Constants
 * Ported from Unity C# Constants.cs
 */

// ============ Game States ============



export enum GameState {
  MainMenu = 'MainMenu',
  Loading = 'Loading',
  Playing = 'Playing',
  Paused = 'Paused',
  GameOver = 'GameOver',
}

export enum TurnState {
  WaitingForDice = 'WaitingForDice',
  Rolling = 'Rolling',
  Moving = 'Moving',
  ChoosingDirection = 'ChoosingDirection',
  OnTile = 'OnTile',
  UsingCard = 'UsingCard',
  TurnEnd = 'TurnEnd',
}

export enum PlayerState {
  Normal = 'Normal',
  InJail = 'InJail',
  InHospital = 'InHospital',
  Bankrupt = 'Bankrupt',
}

// ============ Board & Property ============

export enum TileType {
  Start = 'Start',
  Property = 'Property',
  Bank = 'Bank',
  Shop = 'Shop',
  News = 'News',
  Lottery = 'Lottery',
  Hospital = 'Hospital',
  Prison = 'Prison',
  Park = 'Park',
  Tax = 'Tax',
  Chance = 'Chance',
  Fate = 'Fate',
}

export enum PropertyRegion {
  Suburb = 'Suburb',
  Downtown = 'Downtown',
  Commercial = 'Commercial',
  Luxury = 'Luxury',
}

export enum PropertyFacility {
  None = 'None',
  Park = 'Park',
  Hotel = 'Hotel',
  Mall = 'Mall',
}

// ============ Cards ============

export enum CardType {
  // Attack Cards
  Rob = 'Rob',
  Demolish = 'Demolish',
  Tax = 'Tax',
  Bomb = 'Bomb',
  // Defense Cards
  Shield = 'Shield',
  Insurance = 'Insurance',
  // Movement Cards
  Teleport = 'Teleport',
  Stay = 'Stay',
  Reverse = 'Reverse',
  ControlDice = 'ControlDice',
  Sleep = 'Sleep',
  Turtle = 'Turtle',
  // Economy Cards
  RedCard = 'RedCard',
  BlackCard = 'BlackCard',
  Loan = 'Loan',
}

// GameConstants moved to @/constants/maps

// ============ Interfaces ============

export interface Position {
  x: number
  y: number
}

export interface PlayerData {
  id: string
  name: string
  characterId: string
  money: number
  totalAssets: number
  currentTileIndex: number
  lastTileIndex?: number | null
  state: PlayerState
  turnsToSkip: number
  ownedPropertyIndices: number[]
  cards: CardData[]
  isAI: boolean
  aiDifficulty?: 'easy' | 'normal' | 'hard'
  // Statistics
  stats: PlayerStats
}

export interface PlayerStats {
  totalRentPaid: number
  totalRentReceived: number
  totalTilesPurchased: number
  timesPassedStart: number
}

export interface PropertyData {
  index: number
  name: string
  basePrice: number
  baseRent: number
  region: PropertyRegion
  level: number
  ownerId: string | null
  isMortgaged: boolean
  facilityType: PropertyFacility
  resortEnabled: boolean
  visualScale: number
}

export interface CardData {
  id: string
  type: CardType
  name: string
  description: string
  price: number
  requiresTarget: boolean
}

export interface TileRenderConfig {
  style: 'road' | 'site' | 'empty'
  roadType?: 'straight' | 'corner' | 't-shape' | 'cross'
  buildingSide?: 'inner' | 'outer' // Deprecated, prefer direction
  buildingDirection?: 'left' | 'right' | 'up' | 'down' // Visual offset direction
  modelScale?: number
  buildingSideOffset?: number // Fine tune distance
}

export interface TileData {
  index: number
  type: TileType
  name: string
  position: Position
  propertyData?: PropertyData
  renderConfig?: TileRenderConfig
}

export interface LoanData {
  id: string
  playerId: string
  amount: number
  remainingTurns: number
  interestRate: number
}

export interface DiceResult {
  values: number[]
  total: number
  isDoubles: boolean
}

export interface PendingMove {
  playerId: string
  currentIndex: number
  previousIndex: number | null
  remainingSteps: number
  options: number[]
  hasPassedStart: boolean
}

// ============ Event Types ============

export type GameEventType =
  | 'gameStarted'
  | 'gamePaused'
  | 'gameResumed'
  | 'gameEnded'
  | 'turnStarted'
  | 'turnEnded'
  | 'newRound'
  | 'diceRolling'
  | 'diceRolled'
  | 'playerMoved'
  | 'playerLandedOnTile'
  | 'playerMoneyChanged'
  | 'playerBankrupt'
  | 'playerJailed'
  | 'playerHospitalized'
  | 'propertyPurchased'
  | 'propertyUpgraded'
  | 'propertyMortgaged'
  | 'rentPaid'
  | 'cardDrawn'
  | 'cardUsed'

export interface GameEvent {
  type: GameEventType
  payload?: unknown
  timestamp: number
}

// ============ Map & Config Types ============

export type MapId = 'map1' | 'map2' | 'richman_classic'

export interface PropertyConfig {
  basePrice: number
  baseRent: number
  region: PropertyRegion
  resortEnabled?: boolean
  visualScale?: number
}

export interface MapDefinition {
  id: MapId
  name: string
  layout: Omit<TileData, 'position'>[]
  propertyConfigs: Record<number, PropertyConfig>
  gridPositions?: Record<number, Position>
  connections?: Record<number, number[]>
  startPrevIndex?: number
}

export interface SpecialEventEffect {
  type: 'money' | 'move' | 'teleport' | 'jail' | 'hospital' | 'freeUpgrade' | 'collectFromAll' | 'payToAll' | 'skipTurn' | 'stop'
  amount?: number
  steps?: number
  tileIndex?: number
  turns?: number
}

export interface SpecialEvent {
  id: string
  type: 'news' | 'lottery' | 'chance' | 'fate'
  title: string
  description: string
  effect: SpecialEventEffect
}

