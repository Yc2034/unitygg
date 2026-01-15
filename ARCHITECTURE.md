# 大富翁4 Web版 - 架构设计文档

## 一、项目概述

大富翁4是一款经典的回合制棋盘游戏，玩家通过掷骰子在地图上移动，购买地产、建造房屋、收取过路费，最终让对手破产获胜。

本项目使用现代Web技术栈重新实现大富翁4的核心玩法。

## 二、技术架构

### 2.1 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI框架 | 18.x |
| TypeScript | 类型系统 | 5.x |
| Vite | 构建工具 | 5.x |
| Pixi.js | 2D渲染 | 7.x |
| Zustand | 状态管理 | 4.x |

### 2.2 项目结构

```
web/src/
├── types/
│   └── index.ts              # 所有类型定义、枚举、常量
│
├── stores/
│   └── gameStore.ts          # Zustand游戏状态管理
│
├── components/
│   ├── index.ts              # 组件导出
│   ├── Board.tsx             # Pixi.js棋盘渲染
│   ├── GameUI.tsx            # 游戏UI面板
│   └── MainMenu.tsx          # 主菜单
│
├── utils/
│   └── helpers.ts            # 工具函数
│
├── App.tsx                   # 主应用组件
└── main.tsx                  # 入口文件
```

## 三、核心游戏系统

### 3.1 状态管理 (Zustand Store)

游戏状态集中在 `gameStore.ts` 中管理：

```typescript
interface GameStore {
  // 游戏状态
  gameState: GameState          // MainMenu | Loading | Playing | Paused | GameOver
  turnState: TurnState          // WaitingForDice | Rolling | Moving | OnTile | TurnEnd
  currentPlayerIndex: number
  turnNumber: number
  roundNumber: number

  // 玩家
  players: PlayerData[]

  // 棋盘
  tiles: TileData[]

  // 骰子
  lastDiceResult: DiceResult | null
  forcedDiceValue: number | null

  // 卡片商店
  shopCards: CardData[]

  // 银行贷款
  loans: LoanData[]
}
```

### 3.2 回合系统

回合状态流转：

```
WaitingForDice → Rolling → Moving → OnTile → TurnEnd
      ↑                                          │
      └──────────── NextPlayer ──────────────────┘
```

关键方法：
- `startTurn()` - 开始回合，检查是否需要跳过
- `rollDice()` - 掷骰子
- `movePlayer()` - 移动玩家
- `endTurn()` - 结束回合，处理贷款
- `nextPlayer()` - 切换到下一个玩家

### 3.3 玩家系统

玩家状态：

| 状态 | 说明 |
|------|------|
| Normal | 正常状态 |
| InJail | 在监狱中，跳过若干回合 |
| InHospital | 在医院中，跳过若干回合 |
| Bankrupt | 破产，退出游戏 |

玩家数据：
```typescript
interface PlayerData {
  id: string
  name: string
  money: number
  totalAssets: number
  currentTileIndex: number
  state: PlayerState
  turnsToSkip: number
  ownedPropertyIndices: number[]
  cards: CardData[]
  isAI: boolean
}
```

### 3.4 地产系统

地产等级和租金倍数：

| 等级 | 描述 | 租金倍数 |
|------|------|----------|
| 0 | 空地 | 0x |
| 1 | 房屋 | 1x |
| 2 | 楼房 | 2x |
| 3 | 酒店 | 4x |

区域价格倍数：

| 区域 | 倍数 |
|------|------|
| Suburb (郊区) | 1.0x |
| Downtown (市区) | 1.5x |
| Commercial (商业区) | 2.0x |
| Luxury (豪华区) | 3.0x |

地产操作：
- `purchaseProperty()` - 购买地产
- `upgradeProperty()` - 升级地产
- `mortgageProperty()` - 抵押地产
- `redeemProperty()` - 赎回地产
- `calculateRent()` - 计算租金

### 3.5 卡片系统

已实现的卡片：

| 卡片 | 效果 | 需要目标 |
|------|------|----------|
| 抢劫卡 | 抢夺目标玩家金钱 | 是 |
| 拆迁卡 | 降级目标最高等级地产 | 是 |
| 均贫卡 | 平均分配所有玩家现金 | 否 |
| 传送卡 | 传送到任意格子 | 否 |
| 遥控骰子 | 控制下次骰子点数 | 否 |
| 催眠卡 | 让目标跳过2回合 | 是 |
| 路障卡 | 让目标暂停若干回合 | 是 |
| 炸弹卡 | 在棋盘上放置炸弹 | 否 |

### 3.6 银行系统

- 贷款上限：20,000
- 最大贷款数：每玩家3笔
- 贷款期限：10回合
- 利率：10%
- 抵押率：50%
- 赎回利息：10%

### 3.7 棋盘渲染 (Pixi.js)

棋盘采用矩形环绕布局，使用Pixi.js进行渲染：

- 格子绘制：根据类型显示不同颜色
- 玩家棋子：圆形图形，带编号
- 动画移动：逐格移动动画
- 状态指示：当前玩家高亮

## 四、格子类型

| 类型 | 说明 |
|------|------|
| Start | 起点，经过获得工资 |
| Property | 地产，可购买/升级 |
| Bank | 银行，贷款/存款 |
| Shop | 商店，购买卡片 |
| News | 新闻，随机事件 |
| Lottery | 彩票，购买彩票 |
| Hospital | 医院，休息若干回合 |
| Prison | 监狱，入狱若干回合 |
| Park | 公园，安全区域 |
| Tax | 税务局，缴税 |
| Chance | 机会，随机事件 |
| Fate | 命运，随机事件 |

## 五、游戏常量

```typescript
const GameConstants = {
  MaxPlayers: 4,
  MinPlayers: 2,
  StartingMoney: 50000,
  SalaryOnPassStart: 2000,
  MaxDiceValue: 6,
  MinDiceValue: 1,
  MaxPropertyLevel: 3,
  MaxCardsInHand: 6,
  JailTurns: 3,
  HospitalTurns: 2,
  BailAmount: 1000,
}
```

## 六、已实现功能

- [x] 项目框架搭建 (Vite + React + TypeScript)
- [x] 类型系统定义 (枚举、接口、常量)
- [x] Zustand状态管理
- [x] 回合系统
- [x] 玩家系统 (移动、金钱、状态)
- [x] 地产系统 (购买、升级、抵押)
- [x] 卡片系统 (使用、购买)
- [x] 银行系统 (贷款)
- [x] Pixi.js棋盘渲染
- [x] 玩家移动动画
- [x] 主菜单UI
- [x] 游戏UI面板
- [x] AI控制器
- [x] 特殊格子事件 (新闻、彩票、机会、命运)
- [x] 踩到他人地产支付租金

## 七、待实现功能



- [ ] 更多卡片效果
- [ ] 股票系统
- [ ] 音效和背景音乐
- [ ] 存档/读档系统
- [ ] 更丰富的动画效果
- [ ] 移动端适配

## 八、设计模式

| 模式 | 应用场景 |
|------|----------|
| 单一状态树 | Zustand集中管理游戏状态 |
| 观察者模式 | Zustand订阅状态变化 |
| 工厂模式 | 创建玩家、卡片、格子 |
| 策略模式 | 不同卡片效果实现 |
