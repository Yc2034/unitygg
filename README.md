# 大富翁4复刻 (RichMan 4 Remake)

一个使用Unity开发的大富翁4复刻游戏项目。

## 项目状态

当前阶段：**代码框架搭建完成**

## 快速开始

### 环境要求

- Unity 2022.3 LTS 或更高版本
- Visual Studio 2019+ 或 VS Code（推荐安装C#扩展）

### 安装步骤

1. 安装 Unity Hub：https://unity.com/download
2. 通过 Unity Hub 安装 Unity 2022.3 LTS
3. 克隆此仓库
4. 在 Unity Hub 中点击"Add"添加此项目
5. 打开项目

### 首次使用Unity

如果你是Unity新手，请参阅 [PLAN.md](PLAN.md) 中的"Unity使用指引"章节。

## 项目结构

```
Assets/
├── Scripts/
│   ├── Core/           # 核心系统（GameManager, TurnManager, EventManager）
│   ├── Player/         # 玩家系统（PlayerController, AIController）
│   ├── Board/          # 棋盘系统（Tile, BoardManager）
│   ├── Economy/        # 经济系统（Property, Bank）
│   ├── Cards/          # 卡片系统
│   ├── Dice/           # 骰子系统
│   ├── UI/             # UI系统
│   ├── Audio/          # 音频系统
│   └── Utils/          # 工具类
├── ScriptableObjects/  # 配置数据
├── Prefabs/            # 预制体
├── Scenes/             # 场景
├── Art/                # 美术资源
├── Audio/              # 音频资源
└── Resources/          # 动态加载资源
```

## 开发进度

### 已完成
- [x] 项目结构搭建
- [x] 核心管理器框架（GameManager, TurnManager, EventManager）
- [x] 玩家系统（PlayerController, PlayerData, AIController）
- [x] 棋盘系统（Tile基类及各种格子类型）
- [x] 经济系统（Property, Bank）
- [x] 骰子系统（DiceManager）
- [x] 卡片系统基础框架
- [x] UI系统框架
- [x] 音频系统

### 待完成
- [ ] 在Unity中创建场景和预制体
- [ ] 实现UI界面
- [ ] 添加美术资源
- [ ] 添加音效和BGM
- [ ] 测试和调试
- [ ] 存档系统完善
- [ ] 多人模式（可选）

## 游戏特性

### 核心玩法
- 回合制棋盘游戏
- 骰子决定移动步数
- 购买和升级地产
- 收取过路费
- 各种功能卡片

### 格子类型
- 起点：经过获得工资
- 地产：可购买、升级
- 银行：贷款、存款
- 商店：购买道具
- 新闻站：随机事件
- 彩票站：抽奖
- 医院：治疗
- 监狱：关押
- 公园：安全地带
- 缴税：扣除金钱

### 卡片系统
- 攻击类：抢夺卡、拆除卡、均贫卡
- 移动类：传送卡、停留卡、遥控骰子
- 防御类：免罪卡、保险卡

## 设计文档

详细的架构设计和开发计划请查看 [PLAN.md](PLAN.md)

## 贡献

欢迎提交Issue和Pull Request。

## 许可证

本项目仅供学习交流使用。
