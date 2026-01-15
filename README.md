# 大富翁4 Web版 (RichMan 4 Web)

使用 React + TypeScript + Pixi.js 开发的大富翁4复刻游戏。

## 技术栈

- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Pixi.js 7** - 2D渲染引擎
- **Zustand** - 状态管理

## 游戏功能

### 已实现功能

- 棋盘渲染与玩家移动
- 掷骰子系统
- 地产购买与升级
- 地产抵押与赎回
- 银行贷款系统
- 道具卡系统（抢劫卡、拆迁卡、均贫卡等）
- 道具商店
- 特殊格子事件：
  - **新闻** - 随机事件影响所有玩家（股市涨跌、政府补贴等）
  - **彩票** - 抽奖获得随机奖金
  - **机会** - 正面事件（银行错误、股票分红、免费升级等）
  - **命运** - 随机事件（可能正面也可能负面）
- 踩到他人地产自动支付租金
- 玩家破产系统

### 格子类型

| 格子类型 | 说明 |
|---------|------|
| 起点 | 经过获得工资 |
| 地产 | 可购买、升级，他人踩到需付租金 |
| 银行 | 贷款服务 |
| 商店 | 购买道具卡 |
| 新闻 | 触发影响所有玩家的随机事件 |
| 彩票站 | 抽奖获得随机奖金 |
| 机会 | 触发正面随机事件 |
| 命运 | 触发随机事件（好坏皆有可能） |
| 医院 | 住院休息若干回合 |
| 监狱 | 入狱若干回合 |
| 公园 | 休息格子 |
| 税务局 | 缴纳税款 |

## 快速开始

```bash
# 进入web目录
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

开发服务器启动后访问 http://localhost:5173

## 项目结构

```
web/
├── src/
│   ├── types/          # 类型定义和游戏常量
│   ├── stores/         # Zustand状态管理
│   ├── components/     # React组件
│   ├── utils/          # 工具函数
│   └── game/           # 游戏核心逻辑(待扩展)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览构建结果
npm run lint     # 运行ESLint检查
```

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 项目架构和功能文档
