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
  HotelRentPerDay: 1000,
  MallRentPerDay: 2000,

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

// ============ Default Card Definitions ============

// ============ Special Tile Events ============

export interface SpecialEvent {
  id: string
  type: 'news' | 'lottery' | 'chance' | 'fate'
  title: string
  description: string
  effect: SpecialEventEffect
}

export type SpecialEventEffect =
  | { type: 'money'; amount: number } // 正数得钱，负数扣钱
  | { type: 'move'; steps: number } // 正数前进，负数后退
  | { type: 'teleport'; tileIndex: number } // 传送到指定格子
  | { type: 'jail'; turns: number } // 入狱
  | { type: 'hospital'; turns: number } // 住院
  | { type: 'collectFromAll'; amount: number } // 从所有玩家收钱
  | { type: 'payToAll'; amount: number } // 给所有玩家钱
  | { type: 'freeUpgrade' } // 免费升级一次
  | { type: 'skipTurn'; turns: number } // 跳过回合

// 新闻事件 - 影响所有玩家
export const NewsEvents: Omit<SpecialEvent, 'id'>[] = [
  {
    type: 'news',
    title: '股市大涨',
    description: '股市行情火爆，所有玩家获得 2000 元分红',
    effect: { type: 'money', amount: 2000 },
  },
  {
    type: 'news',
    title: '经济衰退',
    description: '经济不景气，所有玩家损失 1500 元',
    effect: { type: 'money', amount: -1500 },
  },
  {
    type: 'news',
    title: '政府补贴',
    description: '政府发放生活补贴，所有玩家获得 1000 元',
    effect: { type: 'money', amount: 1000 },
  },
  {
    type: 'news',
    title: '通货膨胀',
    description: '物价飞涨，所有玩家损失 800 元',
    effect: { type: 'money', amount: -800 },
  },
]

// 彩票事件 - 随机奖金
export const LotteryEvents: Omit<SpecialEvent, 'id'>[] = [
  {
    type: 'lottery',
    title: '头奖！',
    description: '恭喜中头奖，获得 10000 元！',
    effect: { type: 'money', amount: 10000 },
  },
  {
    type: 'lottery',
    title: '二等奖',
    description: '中了二等奖，获得 5000 元',
    effect: { type: 'money', amount: 5000 },
  },
  {
    type: 'lottery',
    title: '三等奖',
    description: '中了三等奖，获得 2000 元',
    effect: { type: 'money', amount: 2000 },
  },
  {
    type: 'lottery',
    title: '安慰奖',
    description: '运气一般，获得 500 元安慰奖',
    effect: { type: 'money', amount: 500 },
  },
  {
    type: 'lottery',
    title: '未中奖',
    description: '很遗憾，没有中奖',
    effect: { type: 'money', amount: 0 },
  },
]

// 机会事件 - 通常是正面的
export const ChanceEvents: Omit<SpecialEvent, 'id'>[] = [
  {
    type: 'chance',
    title: '银行错误',
    description: '银行出错，多给了你 3000 元',
    effect: { type: 'money', amount: 3000 },
  },
  {
    type: 'chance',
    title: '股票分红',
    description: '你的股票分红了，获得 2500 元',
    effect: { type: 'money', amount: 2500 },
  },
  {
    type: 'chance',
    title: '生日礼物',
    description: '今天是你的生日，每位玩家送你 500 元',
    effect: { type: 'collectFromAll', amount: 500 },
  },
  {
    type: 'chance',
    title: '前进三步',
    description: '获得一次额外移动机会，前进 3 步',
    effect: { type: 'move', steps: 3 },
  },
  {
    type: 'chance',
    title: '免费升级',
    description: '获得一次免费升级房产的机会',
    effect: { type: 'freeUpgrade' },
  },
  {
    type: 'chance',
    title: '回到起点',
    description: '传送回起点，并获得起点奖励',
    effect: { type: 'teleport', tileIndex: 0 },
  },
]

// 命运事件 - 可能正面也可能负面
export const FateEvents: Omit<SpecialEvent, 'id'>[] = [
  {
    type: 'fate',
    title: '被抢劫',
    description: '在路上被抢劫，损失 2000 元',
    effect: { type: 'money', amount: -2000 },
  },
  {
    type: 'fate',
    title: '医疗费用',
    description: '生病住院，支付医疗费 1500 元',
    effect: { type: 'money', amount: -1500 },
  },
  {
    type: 'fate',
    title: '交通事故',
    description: '发生交通事故，住院休养 2 回合',
    effect: { type: 'hospital', turns: 2 },
  },
  {
    type: 'fate',
    title: '入狱',
    description: '违规被捕，入狱 2 回合',
    effect: { type: 'jail', turns: 2 },
  },
  {
    type: 'fate',
    title: '慈善捐款',
    description: '心情好想做慈善，给每位玩家 300 元',
    effect: { type: 'payToAll', amount: 300 },
  },
  {
    type: 'fate',
    title: '后退三步',
    description: '迷路了，后退 3 步',
    effect: { type: 'move', steps: -3 },
  },
  {
    type: 'fate',
    title: '继承遗产',
    description: '远房亲戚去世，继承遗产 5000 元',
    effect: { type: 'money', amount: 5000 },
  },
  {
    type: 'fate',
    title: '税务审计',
    description: '被税务局审计，补缴税款 3000 元',
    effect: { type: 'money', amount: -3000 },
  },
]

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

export const MapTwoLayout: Omit<TileData, 'position'>[] = [
  { index: 0, type: TileType.Start, name: '起点' },
  { index: 1, type: TileType.Property, name: '上海' },
  { index: 2, type: TileType.Property, name: '苏州' },
  { index: 3, type: TileType.Chance, name: '机会' },
  { index: 4, type: TileType.Property, name: '南京' },
  { index: 5, type: TileType.Property, name: '杭州' },
  { index: 6, type: TileType.Tax, name: '税务局' },
  { index: 7, type: TileType.Property, name: '宁波' },
  { index: 8, type: TileType.Shop, name: '道具店' },
  { index: 9, type: TileType.Property, name: '合肥' },
  { index: 10, type: TileType.Property, name: '岔路口' },
  { index: 11, type: TileType.News, name: '新闻' },
  { index: 12, type: TileType.Property, name: '绍兴' },
  { index: 13, type: TileType.Property, name: '南通' },
  { index: 14, type: TileType.Hospital, name: '医院' },
  { index: 15, type: TileType.Property, name: '无锡' },
  { index: 16, type: TileType.Lottery, name: '彩票站' },
  { index: 17, type: TileType.Property, name: '嘉兴' },
  { index: 18, type: TileType.Bank, name: '银行' },
  { index: 19, type: TileType.Property, name: '扬州' },
  { index: 20, type: TileType.Park, name: '公园' },
  { index: 21, type: TileType.Fate, name: '命运' },
  { index: 22, type: TileType.Property, name: '镇江' },
  { index: 23, type: TileType.Property, name: '徐州' },
  { index: 24, type: TileType.Chance, name: '机会' },
  { index: 25, type: TileType.Property, name: '盐城' },
  { index: 26, type: TileType.Property, name: '连云港' },
  { index: 27, type: TileType.Property, name: '泰州' },
  { index: 28, type: TileType.Property, name: '外环路' },
  { index: 29, type: TileType.Property, name: '工业区' },
  { index: 30, type: TileType.Prison, name: '监狱' },
]

export const MapTwoGridPositions: Record<number, Position> = {
  0: { x: 0, y: 7 },
  1: { x: 1, y: 7 },
  2: { x: 2, y: 7 },
  3: { x: 3, y: 7 },
  4: { x: 4, y: 7 },
  5: { x: 5, y: 7 },
  6: { x: 6, y: 7 },
  7: { x: 7, y: 7 },
  8: { x: 7, y: 6 },
  9: { x: 7, y: 5 },
  10: { x: 7, y: 4 },
  11: { x: 7, y: 3 },
  12: { x: 7, y: 2 },
  13: { x: 7, y: 1 },
  14: { x: 7, y: 0 },
  15: { x: 6, y: 0 },
  16: { x: 5, y: 0 },
  17: { x: 4, y: 0 },
  18: { x: 3, y: 0 },
  19: { x: 2, y: 0 },
  20: { x: 1, y: 0 },
  21: { x: 0, y: 0 },
  22: { x: 0, y: 1 },
  23: { x: 0, y: 2 },
  24: { x: 0, y: 3 },
  25: { x: 0, y: 4 },
  26: { x: 0, y: 5 },
  27: { x: 0, y: 6 },
  28: { x: 8, y: 4 },
  29: { x: 9, y: 4 },
  30: { x: 10, y: 4 },
}

const createRingConnections = (size: number): Record<number, number[]> => {
  const connections: Record<number, number[]> = {}
  for (let i = 0; i < size; i++) {
    const prev = (i - 1 + size) % size
    const next = (i + 1) % size
    connections[i] = [prev, next]
  }
  return connections
}

export const MapTwoConnections: Record<number, number[]> = (() => {
  const connections = createRingConnections(28)
  connections[10] = [...connections[10], 28]
  connections[28] = [10, 29]
  connections[29] = [28, 30]
  connections[30] = [29]
  return connections
})()

// ============ Default Property Data ============

export interface PropertyConfig {
  basePrice: number
  baseRent: number
  region: PropertyRegion
  resortEnabled?: boolean
  visualScale?: number
}

export const DefaultPropertyConfigs: Record<number, PropertyConfig> = {
  1: { basePrice: 2000, baseRent: 200, region: PropertyRegion.Suburb },
  2: { basePrice: 2000, baseRent: 200, region: PropertyRegion.Suburb },
  4: { basePrice: 2500, baseRent: 250, region: PropertyRegion.Suburb },
  5: {
    basePrice: 2500,
    baseRent: 250,
    region: PropertyRegion.Suburb,
    resortEnabled: true,
    visualScale: 2,
  },
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
  25: {
    basePrice: 2500,
    baseRent: 250,
    region: PropertyRegion.Suburb,
    resortEnabled: true,
    visualScale: 2,
  },
  26: { basePrice: 4000, baseRent: 400, region: PropertyRegion.Commercial },
}

const MapTwoPropertyIndices = [
  1, 2, 4, 5, 7, 9, 10, 12, 13, 15, 17, 19, 22, 23, 25, 26, 27, 28, 29,
]

const MapTwoPropertyBaseConfigs = [
  DefaultPropertyConfigs[1],
  DefaultPropertyConfigs[2],
  DefaultPropertyConfigs[4],
  DefaultPropertyConfigs[5],
  DefaultPropertyConfigs[8],
  DefaultPropertyConfigs[9],
  DefaultPropertyConfigs[11],
  DefaultPropertyConfigs[12],
  DefaultPropertyConfigs[15],
  DefaultPropertyConfigs[16],
  DefaultPropertyConfigs[18],
  DefaultPropertyConfigs[19],
  DefaultPropertyConfigs[22],
  DefaultPropertyConfigs[23],
  DefaultPropertyConfigs[25],
  DefaultPropertyConfigs[26],
]

export const MapTwoPropertyConfigs: Record<number, PropertyConfig> = MapTwoPropertyIndices.reduce(
  (configs, tileIndex, configIndex) => {
    configs[tileIndex] = MapTwoPropertyBaseConfigs[configIndex % MapTwoPropertyBaseConfigs.length]
    return configs
  },
  {} as Record<number, PropertyConfig>
)

export type MapId = 'map1' | 'map2'

export interface MapDefinition {
  id: MapId
  name: string
  layout: Omit<TileData, 'position'>[]
  propertyConfigs: Record<number, PropertyConfig>
  gridPositions?: Record<number, Position>
  connections?: Record<number, number[]>
  startPrevIndex?: number
}

export const MapDefinitions: MapDefinition[] = [
  {
    id: 'map1',
    name: '地图一',
    layout: DefaultMapLayout,
    propertyConfigs: DefaultPropertyConfigs,
    startPrevIndex: DefaultMapLayout.length - 1,
  },
  {
    id: 'map2',
    name: '地图二',
    layout: MapTwoLayout,
    propertyConfigs: MapTwoPropertyConfigs,
    gridPositions: MapTwoGridPositions,
    connections: MapTwoConnections,
    startPrevIndex: 27,
  },
]
