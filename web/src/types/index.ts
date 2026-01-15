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

// ============ Game Constants ============

export const GameConstants = {
  // Player settings
  MaxPlayers: 4,
  MinPlayers: 2,
  StartingMoney: 50000,
  SalaryOnPassStart: 2000,

  // Dice settings
  MinDiceValue: 1,
  MaxDiceValue: 6,
  DiceCount: 1,

  // Board settings
  DefaultBoardSize: 28,

  // Property settings
  MaxPropertyLevel: 3,
  RentMultipliers: {
    0: 0, // Empty lot
    1: 1.0, // House
    2: 2.0, // Building
    3: 4.0, // Hotel
  } as Record<number, number>,

  // Region price multipliers
  RegionMultipliers: {
    [PropertyRegion.Suburb]: 1.0,
    [PropertyRegion.Downtown]: 1.5,
    [PropertyRegion.Commercial]: 2.0,
    [PropertyRegion.Luxury]: 3.0,
  } as Record<PropertyRegion, number>,

  // Cards
  MaxCardsInHand: 6,

  // Bank
  MaxLoanAmount: 20000,
  MaxLoansPerPlayer: 3,
  LoanTerm: 10,
  LoanInterestRate: 0.1,
  SavingsInterestRate: 0.05,
  MortgageRate: 0.5,
  RedeemInterestRate: 0.1,

  // Special tiles
  JailTurns: 3,
  HospitalTurns: 2,
  BailAmount: 1000,
  LotteryTicketPrice: 200,
  FixedTaxAmount: 500,
  PercentageTaxRate: 0.1,
} as const

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
}

export interface CardData {
  id: string
  type: CardType
  name: string
  description: string
  price: number
  requiresTarget: boolean
}

export interface TileData {
  index: number
  type: TileType
  name: string
  position: Position
  propertyData?: PropertyData
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

// ============ Default Card Definitions ============

export const DefaultCards: Omit<CardData, 'id'>[] = [
  // Attack Cards
  {
    type: CardType.Rob,
    name: '抢劫卡',
    description: '抢夺目标玩家的金钱',
    price: 3000,
    requiresTarget: true,
  },
  {
    type: CardType.Demolish,
    name: '拆迁卡',
    description: '拆除目标玩家最高等级的房产',
    price: 5000,
    requiresTarget: true,
  },
  {
    type: CardType.Tax,
    name: '均贫卡',
    description: '平均分配所有玩家的现金',
    price: 4000,
    requiresTarget: false,
  },
  {
    type: CardType.Bomb,
    name: '炸弹卡',
    description: '在棋盘上放置炸弹',
    price: 2000,
    requiresTarget: false,
  },
  // Movement Cards
  {
    type: CardType.Teleport,
    name: '传送卡',
    description: '传送到任意格子',
    price: 2500,
    requiresTarget: false,
  },
  {
    type: CardType.Stay,
    name: '路障卡',
    description: '让目标玩家暂停若干回合',
    price: 3000,
    requiresTarget: true,
  },
  {
    type: CardType.ControlDice,
    name: '遥控骰子',
    description: '控制下一次骰子的点数',
    price: 3500,
    requiresTarget: false,
  },
  {
    type: CardType.Sleep,
    name: '催眠卡',
    description: '让目标玩家沉睡2回合',
    price: 2500,
    requiresTarget: true,
  },
]

// ============ Default Map Layout ============

export const DefaultMapLayout: Omit<TileData, 'position'>[] = [
  { index: 0, type: TileType.Start, name: '起点' },
  { index: 1, type: TileType.Property, name: '台北' },
  { index: 2, type: TileType.Property, name: '基隆' },
  { index: 3, type: TileType.Chance, name: '机会' },
  { index: 4, type: TileType.Property, name: '新竹' },
  { index: 5, type: TileType.Property, name: '桃园' },
  { index: 6, type: TileType.Tax, name: '税务局' },
  { index: 7, type: TileType.Prison, name: '监狱' },
  { index: 8, type: TileType.Property, name: '台中' },
  { index: 9, type: TileType.Property, name: '彰化' },
  { index: 10, type: TileType.Shop, name: '道具店' },
  { index: 11, type: TileType.Property, name: '南投' },
  { index: 12, type: TileType.Property, name: '云林' },
  { index: 13, type: TileType.Fate, name: '命运' },
  { index: 14, type: TileType.Hospital, name: '医院' },
  { index: 15, type: TileType.Property, name: '嘉义' },
  { index: 16, type: TileType.Property, name: '台南' },
  { index: 17, type: TileType.Lottery, name: '彩票站' },
  { index: 18, type: TileType.Property, name: '高雄' },
  { index: 19, type: TileType.Property, name: '屏东' },
  { index: 20, type: TileType.Bank, name: '银行' },
  { index: 21, type: TileType.Park, name: '公园' },
  { index: 22, type: TileType.Property, name: '台东' },
  { index: 23, type: TileType.Property, name: '花莲' },
  { index: 24, type: TileType.News, name: '新闻' },
  { index: 25, type: TileType.Property, name: '宜兰' },
  { index: 26, type: TileType.Property, name: '澎湖' },
  { index: 27, type: TileType.Chance, name: '机会' },
]

// ============ Default Property Data ============

export const DefaultPropertyConfigs: Record<
  number,
  { basePrice: number; baseRent: number; region: PropertyRegion }
> = {
  1: { basePrice: 2000, baseRent: 200, region: PropertyRegion.Suburb },
  2: { basePrice: 2000, baseRent: 200, region: PropertyRegion.Suburb },
  4: { basePrice: 2500, baseRent: 250, region: PropertyRegion.Suburb },
  5: { basePrice: 2500, baseRent: 250, region: PropertyRegion.Suburb },
  8: { basePrice: 3000, baseRent: 300, region: PropertyRegion.Downtown },
  9: { basePrice: 3000, baseRent: 300, region: PropertyRegion.Downtown },
  11: { basePrice: 3500, baseRent: 350, region: PropertyRegion.Downtown },
  12: { basePrice: 3500, baseRent: 350, region: PropertyRegion.Downtown },
  15: { basePrice: 4000, baseRent: 400, region: PropertyRegion.Commercial },
  16: { basePrice: 4500, baseRent: 450, region: PropertyRegion.Commercial },
  18: { basePrice: 5000, baseRent: 500, region: PropertyRegion.Luxury },
  19: { basePrice: 4500, baseRent: 450, region: PropertyRegion.Commercial },
  22: { basePrice: 3000, baseRent: 300, region: PropertyRegion.Suburb },
  23: { basePrice: 3500, baseRent: 350, region: PropertyRegion.Downtown },
  25: { basePrice: 2500, baseRent: 250, region: PropertyRegion.Suburb },
  26: { basePrice: 4000, baseRent: 400, region: PropertyRegion.Commercial },
}
