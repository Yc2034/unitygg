# 大富翁4 Web版 - 架构设计文档

## 一、项目概述

大富翁4是一款经典的回合制棋盘游戏。本项目使用现代Web技术栈 (React + Pixi.js) 重新实现其核心玩法，重点复刻其经典的2.5D等距视角（Isometric）视觉风格和丰富的游戏机制。

## 二、技术架构

### 2.1 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| React | UI框架 | 18.x |
| TypeScript | 类型系统 | 5.x |
| Vite | 构建工具 | 5.x |
| Pixi.js | 2D/2.5D 渲染引擎 | 8.x |
| Zustand | 状态管理 (Slice Pattern) | 4.x |
| CSS Modules/Variables | 样式系统 | Native |

### 2.2 项目结构

```
web/src/
├── types/
│   └── index.ts              # 核心类型定义 (GameState, TileType, GameAction 等)
│
├── constants/
│   ├── maps.ts               # 通用地图定义、游戏常量 (GameConstants)
│   ├── richmanMap.ts         # "大富翁4" 经典地图的具体布局与数据
│   └── characters.ts         # 角色配置数据
│
├── stores/
│   ├── gameStore.ts          # 主 Store 入口
│   └── slices/
│       ├── playerSlice.ts    # 玩家状态 (资金, 移动, 状态)
│       ├── boardSlice.ts     # 地图数据 (地产, 设施, 租金)
│       ├── gameFlowSlice.ts  # 游戏流程 (回合, 骰子, 胜利判定)
│       ├── cardSlice.ts      # 卡牌与商店系统
│       ├── bankSlice.ts      # 银行与贷款系统
│       ├── eventSlice.ts     # 特殊事件与日志
│       └── actionSlice.ts    # 动画指令队列 (Action Queue)
│
├── components/
│   ├── Board.tsx             # Pixi.js 渲染核心 (处理地图渲染、动画)
│   ├── GameUI.tsx            # 游戏 HUD 层 (侧边栏, 骰子控制, 弹窗)
│   ├── MainMenu.tsx          # 游戏主菜单
│   └── ...
│
├── game/
│   └── AIController.ts       # AI 逻辑控制器
│
└── utils/
    └── helpers.ts            # 工具函数 (计算, 格式化)
```

## 三、核心渲染架构 (Visual Architecture)

项目采用 **逻辑数据与渲染分离** 的架构。`Board.tsx` 负责将逻辑数据可视化为 2.5D 等距地图。

### 3.1 渲染图层 (Z-Index Layers)

Pixi容器结构如下，确保正确的遮挡关系：

```
app.stage
└── WorldContainer (支持缩放/拖拽)
    ├── BackgroundContainer (Z: 0)  - 地形背景
    ├── RoadLayer (Z: 1)            - 道路网络 (Visual Logic: Road Nodes)
    ├── GroundLayer (Z: Height)    - 地面装饰、阴影
    └── ObjectLayer (Z: Sorted Y)   - 动态深度排序层
        ├── Roads (基础路面)
        ├── Properties (地产建筑 - 有偏移)
        ├── Sites (特殊设施 - 银行/商店等)
        └── Players (玩家棋子)
```

### 3.2 2.5D 等距投影逻辑

*   **Road (道路)**:作为基础网格节点。
*   **Property (地产)**: 通过 `buildingDirection` ('up', 'down', 'left', 'right') 属性配置，将建筑模型渲染在道路的 **侧边**，而非正上方。
    *   *Offset Calculation*: 根据方向计算 `(offsetX, offsetY)`，实现"路旁建筑"的视觉效果。
*   **Special Site (特殊地点)**: 如银行、医院。采用 `Road Tile + Adjacent Large Building` 的组合方式渲染，同样使用偏移逻辑，确保视觉上建筑位于道路旁，不阻挡路径。

## 四、状态管理架构 (Store Architecture)

使用 Zustand Slice Pattern，将庞大的游戏状态拆分为独立的切片。

### 4.1 数据流向

1.  **UI/Logic** 触发 Action (如 `rollDice()`).
2.  **Slice** 更新逻辑状态 (如 `turnState = Rolling`).
3.  **Slice** (ActionSlice) 推送 `GameAction` 到队列 (如 `type: 'MOVE'`).
4.  **Board.tsx** 监听 `currentAction`，播放对应动画 (Pixi.js).
5.  **Board.tsx** 动画结束，调用 `completeAction()`.
6.  **Slice** (ActionSlice) 处理 `applyAction()`，更新最终位置数据，进入下一阶段。

### 4.2 关键 Slices

| Slice | 职责 |
|-------|------|
| **boardSlice** | 维护 `tiles` 数组。处理地产购买、升级、连锁店计算。不包含渲染逻辑，只存数据 (`TileData`)。 |
| **playerSlice** | 维护 `players` 数组。处理金钱变更、位置更新、破产判定。 |
| **gameFlowSlice** | 控制回合循环 (Pre-Turn -> Turn -> Post-Turn)。处理骰子逻辑。 |
| **actionSlice** | **核心解耦层**。维护 `actionQueue`。所有涉及动画的逻辑变更都必须通过 Action 分发。 |

## 五、Action Queue 系统

为了解决 "逻辑瞬间完成" 与 "动画需要时间" 的矛盾，引入指令队列。

**Standard Actions**:
*   `MOVE`: 路径移动动画 (步步跳跃).
*   `TELEPORT`: 瞬间转移/传送动画.
*   `TO_JAIL` / `TO_HOSPITAL`: 特殊传送动画.
*   `BANKRUPT`: 破产动画/移除棋子.

## 六、UI 布局系统

新版 UI 采用 **沉浸式 HUD** 设计，而非传统的分屏布局。

*   **Fullscreen Board**: 棋盘铺满全屏，支持拖拽漫游。
*   **Right Sidebar (侧边栏)**:
    *   **Tab System**: 资金 (Funds) / 地产 (Properties) / 卡片 (Cards).
    *   **Info Panel**: 显示当前玩家详细信息。
*   **Floating Elements**:
    *   **Dice Control**: 悬浮于角色或屏幕特定位置的 3D 风格骰子控制器。
    *   **Modals**: 商店、新闻、事件弹窗覆盖在中央。

## 七、游戏数据结构 (Map Data)

地图数据定义在 `src/constants/richmanMap.ts`。

**TileData 结构**:
```typescript
interface TileData {
  index: number;
  type: TileType;      // Start, Property, Bank, Shop...
  position: {x, y};    // 逻辑网格坐标
  renderConfig: {
    style: 'road' | 'site';
    buildingDirection?: 'up'|'down'|'left'|'right'; // 关键：决定建筑朝向
  };
  propertyData?: { ... } // 地产特有数据 (价格, 等级, 业主)
}
```

## 八、未来扩展规划

*   **多地图支持**: 通过加载不同的 JSON/TS 配置切换地图。
*   **存档系统**: 序列化 `gameStore` 状态至 LocalStorage。
*   **股票系统**: 新增 `stockSlice` 和对应 UI Tab。
*   **网络联机**: 预留 Action Queue 接口，对接 WebSocket 同步 Actions。
