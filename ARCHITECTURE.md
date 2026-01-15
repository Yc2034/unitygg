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
| Zustand | 状态管理 (Slice Pattern) | 4.x |

### 2.2 项目结构

```
web/src/
├── types/
│   └── index.ts              # 所有类型定义、枚举、常量、事件配置
│
├── stores/
│   ├── gameStore.ts          # 主 Store，合并所有 Slices
│   └── slices/
│       ├── types.ts          # Slice 类型定义 (GameStore, SliceCreator, GameAction)
│       ├── playerSlice.ts    # 玩家数据、移动、资金操作
│       ├── boardSlice.ts     # 地图数据、地产操作、设施、租金
│       ├── gameFlowSlice.ts  # 游戏状态、回合流转、骰子
│       ├── cardSlice.ts      # 卡牌系统、商店
│       ├── bankSlice.ts      # 贷款系统
│       ├── eventSlice.ts     # 特殊事件、日志
│       └── actionSlice.ts    # Action Queue 指令队列
│
├── components/
│   ├── index.ts              # 组件导出
│   ├── Board.tsx             # Pixi.js棋盘渲染 + 动画
│   ├── GameUI.tsx            # 游戏UI面板
│   └── MainMenu.tsx          # 主菜单
│
├── game/
│   └── AIController.ts       # AI 玩家控制器
│
├── utils/
│   └── helpers.ts            # 工具函数 (ID生成、位置计算、颜色等)
│
├── App.tsx                   # 主应用组件
└── main.tsx                  # 入口文件
```

## 三、状态管理架构 (Zustand Slice Pattern)

### 3.1 架构概览

采用 Zustand Slice Pattern 将状态拆分为独立的 slice，每个 slice 负责单一职责：

```
┌─────────────────────────────────────────────────────────────┐
│                      gameStore.ts                           │
│  useGameStore = create<GameStore>()({                       │
│    ...createPlayerSlice(...),                               │
│    ...createBoardSlice(...),                                │
│    ...createGameFlowSlice(...),                             │
│    ...createCardSlice(...),                                 │
│    ...createBankSlice(...),                                 │
│    ...createEventSlice(...),                                │
│    ...createActionSlice(...),                               │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Slice 职责划分

| Slice | 文件 | 状态 | 主要方法 |
|-------|------|------|----------|
| **PlayerSlice** | `playerSlice.ts` | `players`, `currentPlayerIndex` | `movePlayer`, `teleportPlayer`, `addMoney`, `spendMoney`, `transferMoney`, `sendToJail`, `sendToHospital`, `setBankrupt`, `getCurrentPlayer`, `getPlayer`, `getActivePlayers` |
| **BoardSlice** | `boardSlice.ts` | `tiles`, `boardSize` | `purchaseProperty`, `upgradeProperty`, `mortgageProperty`, `redeemProperty`, `calculateRent`, `setPropertyFacility`, `payRent`, `payResortFee`, `getTile`, `getProperty`, `getPropertyOwner` |
| **GameFlowSlice** | `gameFlowSlice.ts` | `gameState`, `turnState`, `turnNumber`, `roundNumber`, `lastDiceResult`, `forcedDiceValue` | `initGame`, `startGame`, `pauseGame`, `endGame`, `startTurn`, `endTurn`, `nextPlayer`, `rollDice`, `setForcedDiceValue`, `checkWinCondition` |
| **CardSlice** | `cardSlice.ts` | `shopCards` | `addCard`, `removeCard`, `useCard`, `refreshShop`, `buyCard` |
| **BankSlice** | `bankSlice.ts` | `loans` | `takeLoan`, `processLoans` |
| **EventSlice** | `eventSlice.ts` | `gameLog`, `currentEvent`, `hasFreeUpgrade` | `addLog`, `setCurrentEvent`, `setHasFreeUpgrade`, `handleTileEvent`, `applyEventEffect` |
| **ActionSlice** | `actionSlice.ts` | `actionQueue`, `currentAction`, `isProcessing` | `pushAction`, `pushActions`, `completeAction`, `clearActions`, `applyAction`, `createMoveAction`, `createTeleportAction`, `createToJailAction`, `createToHospitalAction`, `createBankruptAction` |

### 3.3 Slice 间依赖

Slice 之间通过 `get()` 方法相互调用：

```typescript
// 在 boardSlice.ts 中调用 playerSlice 的方法
purchaseProperty: (playerId, tileIndex) => {
  const { getPlayer, spendMoney, addLog } = get()  // 访问其他 slice
  // ...
}
```

## 四、Action Queue 架构

### 4.1 设计目的

将游戏逻辑与渲染动画解耦，逻辑层不需要知道动画播放时长。

### 4.2 数据流

```
┌─────────────────┐     pushAction()     ┌─────────────────┐
│   Game Logic    │ ──────────────────► │   Action Queue   │
│   (Slices)      │                      │   (actionSlice)  │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         currentAction
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │    Board.tsx    │
                                         │   (Animation)   │
                                         └────────┬────────┘
                                                  │
                                         completeAction()
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  State Update   │
                                         │  + Next Action  │
                                         └─────────────────┘
```

### 4.3 Action 类型

```typescript
type GameAction =
  | { type: 'MOVE'; playerId: string; path: number[]; passedStart?: boolean }
  | { type: 'TELEPORT'; playerId: string; fromIndex: number; toIndex: number }
  | { type: 'TO_JAIL'; playerId: string; jailIndex: number; turns: number }
  | { type: 'TO_HOSPITAL'; playerId: string; hospitalIndex: number; turns: number }
  | { type: 'BANKRUPT'; playerId: string }
```

### 4.4 典型流程：掷骰子移动

```
1. 用户点击掷骰子
2. rollDice() 执行
   - 生成骰子值
   - 设置 turnState = Rolling
   - 创建 MOVE Action 并 pushAction()
3. Board.tsx 监听 currentAction
   - 检测到 MOVE Action
   - 播放步进动画 animateMovement()
4. 动画完成
   - 调用 completeAction()
   - applyAction() 更新玩家位置
   - 设置 turnState = OnTile
```

## 五、核心游戏系统

### 5.1 回合状态流转

```
WaitingForDice → Rolling → Moving → OnTile → TurnEnd
      ↑                                          │
      └──────────── NextPlayer ──────────────────┘
```

| 状态 | 触发条件 | 下一状态 |
|------|----------|----------|
| WaitingForDice | `startTurn()` | Rolling (点击骰子) |
| Rolling | `rollDice()` | Moving (动画开始) |
| Moving | Action Queue 播放动画 | OnTile (动画完成) |
| OnTile | `completeAction()` | TurnEnd (处理完地块) |
| TurnEnd | `endTurn()` | WaitingForDice (下一玩家) |

### 5.2 玩家系统

玩家状态：

| 状态 | 说明 | 跳过回合 |
|------|------|----------|
| Normal | 正常状态 | 否 |
| InJail | 在监狱中 | 是 (3回合) |
| InHospital | 在医院中 | 是 (2回合) |
| Bankrupt | 破产 | 永久退出 |

**添加新玩家操作的位置**: `playerSlice.ts`

### 5.3 地产系统

等级和租金：

| 等级 | 描述 | 租金倍数 |
|------|------|----------|
| 0 | 空地 | 0x |
| 1 | 房屋 | 1x |
| 2 | 楼房 | 2x |
| 3 | 酒店 | 3x |

区域价格倍数：

| 区域 | 倍数 |
|------|------|
| Suburb (郊区) | 1.0x |
| Downtown (市区) | 1.5x |
| Commercial (商业区) | 2.0x |
| Luxury (豪华区) | 3.0x |

**添加新地产功能的位置**: `boardSlice.ts`

### 5.4 卡片系统

已实现的卡片：

| 卡片 | 效果 | 需要目标 |
|------|------|----------|
| 抢劫卡 | 抢夺目标玩家金钱(最多5000) | 是 |
| 拆迁卡 | 降级目标最高等级地产 | 是 |
| 均贫卡 | 平均分配所有玩家现金 | 否 |
| 传送卡 | 传送到起点 | 否 |
| 遥控骰子 | 下次骰子点数为6 | 否 |
| 催眠卡 | 让目标跳过2回合 | 是 |

**添加新卡片的位置**:
- 卡片定义: `types/index.ts` 的 `DefaultCards`
- 卡片效果: `cardSlice.ts` 的 `useCard()` switch case

### 5.5 特殊事件系统

事件类型：

| 格子类型 | 影响范围 | 事件配置位置 |
|----------|----------|--------------|
| News | 所有玩家 | `types/index.ts` → `NewsEvents` |
| Lottery | 当前玩家 | `types/index.ts` → `LotteryEvents` |
| Chance | 当前玩家 | `types/index.ts` → `ChanceEvents` |
| Fate | 当前玩家 | `types/index.ts` → `FateEvents` |

事件效果类型：

| 效果 | 说明 |
|------|------|
| `money` | 增减金钱 |
| `move` | 相对移动 |
| `teleport` | 传送到指定格 |
| `jail` | 进监狱 |
| `hospital` | 进医院 |
| `collectFromAll` | 从所有玩家收钱 |
| `payToAll` | 向所有玩家付钱 |
| `freeUpgrade` | 免费升级机会 |
| `skipTurn` | 跳过回合 |

**添加新事件的位置**: `types/index.ts` 对应的事件数组

### 5.6 银行系统

| 参数 | 值 |
|------|-----|
| 最大贷款金额 | 10,000 |
| 最大贷款数 | 5笔/玩家 |
| 贷款期限 | 10回合 |
| 利率 | 10% |
| 抵押率 | 50% |
| 赎回利息 | 10% |

**添加银行功能的位置**: `bankSlice.ts`

## 六、渲染层 (Board.tsx)

### 6.1 Pixi.js 结构

```
app.stage
└── cameraContainer (相机容器，支持缩放和平移)
    └── worldContainer (世界容器)
        ├── backgroundContainer (背景层 zIndex=0)
        │   └── boardBase (棋盘底座)
        ├── tilesContainer (地块层 zIndex=1)
        │   └── tileContainer × N (每个地块)
        └── entitiesContainer (实体层 zIndex=2)
            ├── building:${index} × N (建筑)
            └── player:${id} × N (玩家棋子)
```

### 6.2 动画函数

| 函数 | 用途 | 触发的 Action |
|------|------|---------------|
| `animateMovement()` | 步进移动动画 | MOVE |
| `animateTeleport()` | 传送动画(淡出淡入) | TELEPORT |
| `animateSpecialTeleport()` | 监狱/医院传送 | TO_JAIL, TO_HOSPITAL |

**添加新动画的位置**: `Board.tsx` 中添加新的动画函数，然后在 `currentAction` 监听的 switch case 中调用

## 七、功能添加指南

### 7.1 添加新的游戏状态/方法

1. 在 `types.ts` 定义接口
2. 找到对应的 slice 文件
3. 添加状态和方法实现
4. GameStore 类型会自动合并

### 7.2 添加新的 Action 类型

1. 在 `types.ts` 的 `GameAction` 类型中添加新类型
2. 在 `actionSlice.ts` 中：
   - 添加 `createXxxAction()` 方法
   - 在 `applyAction()` 中处理状态更新
3. 在 `Board.tsx` 中：
   - 添加对应的动画函数
   - 在 `currentAction` 监听中添加 case

### 7.3 添加新的卡片

1. 在 `types/index.ts` 的 `CardType` 枚举添加类型
2. 在 `DefaultCards` 数组添加卡片配置
3. 在 `cardSlice.ts` 的 `useCard()` 中添加效果实现

### 7.4 添加新的特殊事件

1. 在 `types/index.ts` 对应的事件数组中添加事件配置：
   - `NewsEvents` / `LotteryEvents` / `ChanceEvents` / `FateEvents`
2. 如需新效果类型，在 `SpecialEventEffect` 类型中添加
3. 在 `eventSlice.ts` 的 `applyEventEffect()` 中处理新效果

### 7.5 添加新的地块类型

1. 在 `types/index.ts` 的 `TileType` 枚举添加类型
2. 在 `DefaultMapLayout` 中配置地块
3. 在 `helpers.ts` 的 `getTileColor()` 添加颜色
4. 如需特殊处理，在相应 slice 中添加逻辑

## 八、游戏常量

```typescript
const GameConstants = {
  MaxPlayers: 4,
  MinPlayers: 2,
  StartingMoney: 50000,
  SalaryOnPassStart: 2000,
  DefaultBoardSize: 40,
  MaxDiceValue: 6,
  MinDiceValue: 1,
  MaxPropertyLevel: 3,
  MaxCardsInHand: 6,
  JailTurns: 3,
  HospitalTurns: 2,
  MaxLoanAmount: 10000,
  MaxLoansPerPlayer: 5,
  LoanTerm: 10,
  LoanInterestRate: 0.1,
  MortgageRate: 0.5,
  RedeemInterestRate: 0.1,
}
```

## 九、关键文件快速索引

| 需求 | 文件位置 |
|------|----------|
| 类型定义/枚举/常量 | `types/index.ts` |
| 玩家操作 | `stores/slices/playerSlice.ts` |
| 地产/租金 | `stores/slices/boardSlice.ts` |
| 游戏流程/骰子 | `stores/slices/gameFlowSlice.ts` |
| 卡片 | `stores/slices/cardSlice.ts` |
| 贷款 | `stores/slices/bankSlice.ts` |
| 事件/日志 | `stores/slices/eventSlice.ts` |
| 动画队列 | `stores/slices/actionSlice.ts` |
| 棋盘渲染/动画 | `components/Board.tsx` |
| 游戏UI | `components/GameUI.tsx` |
| AI逻辑 | `game/AIController.ts` |
| 工具函数 | `utils/helpers.ts` |

## 十、已实现功能

- [x] Zustand Slice Pattern 状态管理
- [x] Action Queue 指令队列（逻辑/动画解耦）
- [x] 回合系统
- [x] 玩家系统 (移动、金钱、状态)
- [x] 地产系统 (购买、升级、抵押、设施)
- [x] 卡片系统 (使用、购买)
- [x] 银行系统 (贷款)
- [x] Pixi.js 等距棋盘渲染
- [x] 玩家移动动画 (步进/传送)
- [x] 主菜单UI
- [x] 游戏UI面板
- [x] AI控制器
- [x] 特殊格子事件 (新闻、彩票、机会、命运)
- [x] 租金支付

## 十一、待实现功能

- [ ] 股票系统 (建议新建 `stockSlice.ts`)
- [ ] 多地图支持
- [ ] 存档/读档系统
- [ ] 更丰富的动画效果
- [ ] 移动端适配
- [ ] 更多卡片效果
- [ ] 音效和背景音乐
