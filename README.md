# 大富翁4 Web版 (RichMan 4 Web)

使用 React + TypeScript + Pixi.js 开发的大富翁4复刻游戏。

## 技术栈

- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Pixi.js 7** - 2D渲染引擎
- **Zustand** - 状态管理

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
