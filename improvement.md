# 大富翁 4 Web 版 (TypeScript) - 改进与方向性建议

本文档基于对当前项目架构 (`ARCHITECTURE.md`, `gameStore.ts`, `Board.tsx`) 的分析，提出针对性的架构优化与新功能实现方向建议。

## 一、 架构优化：切分状态管理 (Slice Pattern)

目前 `gameStore.ts` 承担了过多的职责（游戏流、玩家、地图、UI、交互），是一个典型的 "God Object"。建议利用 Zustand 的 Slice 模式将状态拆分。

### 建议的文件结构
```
src/stores/
├── gameStore.ts          # 主 Store，合并所有 Slices
├── slices/
│   ├── playerSlice.ts    # 玩家数据、移动、资金操作
│   ├── boardSlice.ts     # 地图数据、地产升级、设施
│   ├── gameFlowSlice.ts  # 回合流转、各个阶段 (Rolling/Moving) 切换
│   ├── systemSlice.ts    # UI弹窗、音效配置、全局设置
│   └── stockSlice.ts     # (新) 股票市场逻辑
```

### 实施方式
将 `gameStore.ts` 改为组合模式：
```typescript
export const useGameStore = create<GameStore>()((...a) => ({
  ...createPlayerSlice(...a),
  ...createBoardSlice(...a),
  ...createGameFlowSlice(...a),
  // ...
}))
```
**收益**：
*   **可维护性**：每个文件都在 200-300 行以内，逻辑清晰。
*   **团队协作**：减少 Git 冲突。

## 二、 逻辑与渲染分离：指令队列 (Action Queue)

目前 `Board.tsx` 中的动画逻辑与状态更新耦合较紧。如果未来引入更复杂的连锁反应（如：踩地雷 ->爆炸动画 -> 飞到医院 -> 住院动画），当前的 Promise 链式调用会很难维护。

### 建议方案
引入 **Action Queue** 中间层：
1.  **Store** 不直接修改状态并假设 UI 立即把动画播完，而是产生一个 `Action` 和 `State Update`。
2.  **UI 层** 监听 `currentAction`。
3.  **流程**：
    *   逻辑层：`pushAction({ type: 'MOVE', playerId: 'p1', path: [1, 2, 3] })`
    *   UI 层：监听到 Action -> 播放动画 -> 动画结束 -> 调用 `completeAction()`
    *   逻辑层：`completeAction()` 触发状态更新，检查是否有下一个 Action。

**收益**：逻辑层不需要知道动画播了多久，只需要关心数据变更。

## 三、 新功能实现方向

### 1. 股票系统 (Stock Market)
股票是大富翁4的核心机制。

*   **数据结构**：
    ```typescript
    interface Stock {
      id: string;
      name: string;
      currentPrice: number;
      basePrice: number;     // 基准价格
      volatility: number;    // 波动率 (大盘股波动小，妖股波动大)
      trend: number;         // 当前趋势向量 (-1.0 到 1.0)
      sharesIssued: number;  // 发行量
    }
    ```
*   **模拟算法**：
    不要使用纯随机 (`Math.random()`)，建议使用 **随机游走 (Random Walk)** 结合 **均值回归 (Mean Reversion)**。
    *   每回合更新价格：`NewPrice = OldPrice * (1 + Trend + Noise)`
    *   `Trend` 会缓慢变化，模拟牛市/熊市。
    *   **红黑卡实现**：实际上就是强行修改某只股票的 `Trend` 值为极大或极小，并锁定若干回合。

### 2. 神仙系统 (God System)
神仙附体本质上是一个 **临时状态修改器 (Temporal State Modifier)**。

*   **设计模式**：Decorator / Modifier 模式。
*   **修改 PlayerData**：
    ```typescript
    interface PlayerData {
      // ... 原有字段
      modifiers: PlayerModifier[]; 
    }

    interface PlayerModifier {
      id: string;          // 'god_fortune', 'god_poverty'
      type: 'rent_free' | 'double_pay' | 'always_roll_6';
      remainingRounds: number;
      visualAssetId: string; // 前端显示的贴图 ID
    }
    ```
*   **生效逻辑**：
    在计算租金时：
    ```typescript
    function calculateFinalRent(baseRent: number, player: PlayerData) {
      if (player.modifiers.find(m => m.type === 'rent_free')) return 0;
      if (player.modifiers.find(m => m.type === 'double_pay')) return baseRent * 2;
      return baseRent;
    }
    ```

## 四、 为未来联机做准备 (Multiplayer Readiness)

即使现在是单机 Web 版，也建议采用 **命令模式 (Command Pattern)** 来封装所有修改游戏状态的操作。

*   **现状**：UI 直接调用 `store.rollDice()`。
*   **改进**：
    1.  定义所有操作的 Interface (Payload)。
    2.  `store.dispatch(action)`。
*   **为何这样做**：
    一旦需要联机，你只需要把这个 `action` 对象通过 WebSocket 发送给服务端，服务端广播给所有客户端，客户端重放这个 Action，就能实现简单的联机同步。

## 五、 UI/UX 细节建议

1.  **地图动态缩放**：目前的固定视角在地图变大后会看不清。建议实现类似原版的“关注当前玩家”视角，但在空闲时允许玩家拖拽查看全图。
2.  **小地图 (Minimap)**：如果地图路径复杂，需要一个小地图来显示其他玩家位置。
3.  **动画性能**：Pixi.js 性能很好，但尽量减少 React 组件的重渲染。`GameUI` 层和 `Board` 层最好完全解耦，`Board` 内部的每帧更新 (`useTick`) 里面不要有 React 状态更新触发的 render。

## 六、 美术资源与渲染规范 (Art Assets & Rendering Pipeline)

为了达到原版《大富翁4》级别的视觉效果，需要建立 **3D 建模 -> 2D 渲染** 的工作流。Pixi.js 完美支持这种 2.5D (Isometric) 风格。

### 1. 核心思路：预渲染 (Pre-rendered)
游戏引擎（Pixi.js）不需要实时计算 3D 模型的光照和顶点，而是显示**高质量的 2D 贴图**。这些贴图是由 3D 软件（Blender/C4D/Maya）渲染出来的。

### 2. 资源格式规范

#### A. 场景地图 (Game Map)
*   **制作方式**：在 3D 软件中搭建完整岛屿，设定好光照和摄像机角度（45度等轴测）。
*   **输出格式**：**大型 PNG 图片**（建议切分为 1024x1024 或 2048x2048 的瓦片图以便加载）。
*   **特殊处理**：海洋部分可以单独处理，使用 Shader 实现动态水波纹效果，或者使用带透明通道的 PNG 叠加。

#### B. 建筑与地块 (Buildings & Props)
*   **静态建筑**：**PNG 图片**（背景透明）。
*   **动态特效**：例如建造时的烟尘、霓虹灯闪烁。使用 **Sprite Sheet (精灵表单)**。
    *   推荐工具：TexturePacker。
    *   输出：`.json` (坐标数据) + `.png` (合图)。

#### C. 角色动画 (Characters)
*   **推荐方案**：**Spine 2D** 或 **DragonBones**。
    *   **原理**：骨骼动画 (Skeletal Animation)。
    *   **优点**：文件极小，动作如丝般顺滑（60fps），换装容易。
    *   **输出格式**：`.json` (骨骼) + `.atlas` (图集) + `.png` (贴图)。
    *   **引擎支持**：使用 `pixi-spine` 插件。
*   **替代方案**：传统 PNG 序列帧（如原版大富翁4）。
    *   优点：还原老游戏质感。
    *   缺点：动作生硬，资源体积大（每个朝向都要一套图）。

#### D. UI 界面
*   **格式**：**PNG**。
*   **技术**：使用 **9-Slice (九宫格)** 技术。美术只需提供小尺寸的圆角框素材，代码可无损拉伸。

### 3. 实现细节 (Implementation)
*   **Z-Ordering (深度排序)**：
    在 2.5D 游戏中，物体遮挡关系由 Y 轴决定。
    ```typescript
    // 伪代码：在 Pixi.js 的 ticker 中每帧运行
    sprite.zIndex = sprite.y; // Y 轴越靠下（越大），层级越高，遮挡后面的物体
    container.sortChildren(); // 实时排序
    ```
