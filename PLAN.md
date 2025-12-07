# 大富翁4复刻游戏 - 架构设计文档

## 一、项目概述

大富翁4是一款经典的回合制棋盘游戏，玩家通过掷骰子在地图上移动，购买地产、建造房屋、收取过路费，最终让对手破产获胜。

## 二、核心游戏机制

### 2.1 基础玩法
- **回合制系统**：玩家轮流行动
- **骰子系统**：掷骰子决定移动步数
- **地产系统**：购买、升级、抵押地产
- **金钱系统**：初始资金、收租、缴费
- **卡片系统**：各种功能卡片（均贫卡、抢夺卡、陷害卡等）
- **事件系统**：随机事件、特殊格子事件

### 2.2 特殊格子类型
- 空地（可购买）
- 已建房地产
- 银行
- 新闻站
- 商店（购买道具）
- 彩票站
- 医院
- 监狱
- 起点

### 2.3 角色系统
- 不同角色有不同特性
- 角色动画和表情

## 三、代码架构设计

### 3.1 项目结构
```
Assets/
├── Scripts/
│   ├── Core/                    # 核心系统
│   │   ├── GameManager.cs       # 游戏总管理器（单例）
│   │   ├── TurnManager.cs       # 回合管理器
│   │   ├── EventManager.cs      # 事件系统
│   │   └── SaveManager.cs       # 存档系统
│   │
│   ├── Player/                  # 玩家相关
│   │   ├── Player.cs            # 玩家基类
│   │   ├── PlayerController.cs  # 玩家控制器
│   │   ├── PlayerData.cs        # 玩家数据
│   │   └── AIController.cs      # AI控制器
│   │
│   ├── Board/                   # 棋盘相关
│   │   ├── BoardManager.cs      # 棋盘管理器
│   │   ├── Tile.cs              # 格子基类
│   │   ├── PropertyTile.cs      # 地产格子
│   │   ├── EventTile.cs         # 事件格子
│   │   ├── SpecialTile.cs       # 特殊格子（银行、商店等）
│   │   └── TileData.cs          # 格子数据
│   │
│   ├── Economy/                 # 经济系统
│   │   ├── EconomyManager.cs    # 经济管理器
│   │   ├── Property.cs          # 地产类
│   │   ├── Bank.cs              # 银行系统
│   │   └── Stock.cs             # 股票系统（可选）
│   │
│   ├── Cards/                   # 卡片系统
│   │   ├── CardManager.cs       # 卡片管理器
│   │   ├── Card.cs              # 卡片基类
│   │   ├── CardData.cs          # 卡片数据（ScriptableObject）
│   │   └── CardEffects/         # 各种卡片效果
│   │       ├── RobCard.cs       # 抢夺卡
│   │       ├── TaxCard.cs       # 均贫卡
│   │       └── ...
│   │
│   ├── Dice/                    # 骰子系统
│   │   ├── DiceManager.cs       # 骰子管理器
│   │   └── Dice.cs              # 骰子类
│   │
│   ├── UI/                      # UI系统
│   │   ├── UIManager.cs         # UI管理器
│   │   ├── MainMenuUI.cs        # 主菜单
│   │   ├── GameUI.cs            # 游戏界面
│   │   ├── PlayerInfoUI.cs      # 玩家信息面板
│   │   ├── PropertyInfoUI.cs    # 地产信息面板
│   │   ├── DialogUI.cs          # 对话框
│   │   └── CardUI.cs            # 卡片UI
│   │
│   ├── Audio/                   # 音频系统
│   │   ├── AudioManager.cs      # 音频管理器
│   │   └── SoundData.cs         # 音效数据
│   │
│   ├── Animation/               # 动画系统
│   │   ├── CharacterAnimator.cs # 角色动画控制
│   │   └── EffectAnimator.cs    # 特效动画
│   │
│   └── Utils/                   # 工具类
│       ├── Singleton.cs         # 单例基类
│       ├── ObjectPool.cs        # 对象池
│       └── Constants.cs         # 常量定义
│
├── ScriptableObjects/           # 可配置数据
│   ├── Characters/              # 角色配置
│   ├── Cards/                   # 卡片配置
│   ├── Properties/              # 地产配置
│   └── Maps/                    # 地图配置
│
├── Prefabs/                     # 预制体
│   ├── Characters/              # 角色预制体
│   ├── Tiles/                   # 格子预制体
│   ├── UI/                      # UI预制体
│   └── Effects/                 # 特效预制体
│
├── Scenes/                      # 场景
│   ├── MainMenu.unity           # 主菜单场景
│   ├── Game.unity               # 游戏场景
│   └── Loading.unity            # 加载场景
│
├── Art/                         # 美术资源
│   ├── Sprites/                 # 2D精灵
│   ├── Textures/                # 纹理
│   ├── Models/                  # 3D模型（如果使用3D）
│   └── Animations/              # 动画资源
│
├── Audio/                       # 音频资源
│   ├── BGM/                     # 背景音乐
│   └── SFX/                     # 音效
│
└── Resources/                   # 动态加载资源
```

### 3.2 核心类设计

#### GameManager（游戏管理器）
```csharp
public class GameManager : Singleton<GameManager>
{
    public GameState CurrentState { get; private set; }
    public List<Player> Players { get; private set; }
    public Player CurrentPlayer { get; private set; }

    public void StartGame();
    public void EndGame();
    public void PauseGame();
    public void ResumeGame();
}
```

#### TurnManager（回合管理器）
```csharp
public class TurnManager : MonoBehaviour
{
    public event Action<Player> OnTurnStart;
    public event Action<Player> OnTurnEnd;

    public void StartTurn();
    public void EndTurn();
    public void NextPlayer();
}
```

#### Player（玩家类）
```csharp
public class Player : MonoBehaviour
{
    public string PlayerName;
    public int Money;
    public int CurrentTileIndex;
    public List<Property> OwnedProperties;
    public List<Card> Cards;
    public PlayerState State;

    public void Move(int steps);
    public bool CanAfford(int amount);
    public void Pay(int amount);
    public void Receive(int amount);
}
```

#### Tile（格子基类）
```csharp
public abstract class Tile : MonoBehaviour
{
    public int TileIndex;
    public TileType Type;
    public string TileName;

    public abstract void OnPlayerLand(Player player);
    public abstract void OnPlayerPass(Player player);
}
```

### 3.3 设计模式应用

1. **单例模式**：GameManager, AudioManager, UIManager
2. **状态模式**：游戏状态、玩家状态
3. **策略模式**：AI行为、卡片效果
4. **观察者模式**：事件系统
5. **工厂模式**：创建格子、卡片
6. **对象池**：特效、临时对象

### 3.4 状态机设计

#### 游戏状态
```
GameState:
- MainMenu（主菜单）
- Loading（加载中）
- Playing（游戏中）
- Paused（暂停）
- GameOver（游戏结束）
```

#### 回合状态
```
TurnState:
- WaitingForDice（等待掷骰子）
- Rolling（掷骰中）
- Moving（移动中）
- OnTile（在格子上处理事件）
- UsingCard（使用卡片）
- TurnEnd（回合结束）
```

## 四、Unity使用指引（新手向）

### 4.1 Unity安装和项目创建

1. **下载Unity Hub**
   - 访问 https://unity.com/download
   - 下载并安装 Unity Hub

2. **安装Unity编辑器**
   - 推荐版本：Unity 2022.3 LTS（长期支持版）
   - 在Unity Hub中点击"Installs" -> "Install Editor"
   - 选择2022.3.x LTS版本

3. **创建新项目**
   - 点击"New Project"
   - 选择"2D"模板（大富翁适合2D开发）
   - 项目名称：RichMan4
   - 选择保存位置为当前仓库目录

### 4.2 Unity界面介绍

```
┌─────────────────────────────────────────────────────────────┐
│  Scene View  │  Game View  │                                │
│  (场景编辑)   │  (游戏预览)  │       Inspector               │
│              │             │       (检视面板)                │
│              │             │       - 查看/编辑组件属性        │
├──────────────┴─────────────┤                                │
│  Hierarchy                 │                                │
│  (层级面板)                 │                                │
│  - 场景中的所有对象          │                                │
├────────────────────────────┼────────────────────────────────┤
│  Project                   │  Console                       │
│  (项目面板)                 │  (控制台)                       │
│  - 所有资源文件             │  - 日志和错误信息               │
└────────────────────────────┴────────────────────────────────┘
```

### 4.3 重要概念

#### GameObject（游戏对象）
- Unity中的所有物体都是GameObject
- 可以添加各种Component（组件）

#### Component（组件）
- Transform：位置、旋转、缩放
- SpriteRenderer：显示2D图片
- Collider2D：碰撞检测
- 自定义脚本也是组件

#### Prefab（预制体）
- 可重复使用的GameObject模板
- 修改预制体会更新所有实例

#### ScriptableObject
- 用于存储数据的资源
- 不依附于场景中的对象
- 适合存储配置数据（如卡片属性、地产价格）

### 4.4 开发步骤建议

#### 第一阶段：基础框架（1-2周学习+实践）
1. 创建Unity项目
2. 设置项目结构（创建文件夹）
3. 实现GameManager单例
4. 创建简单的棋盘（一圈格子）
5. 实现玩家移动

#### 第二阶段：核心玩法（2-3周）
1. 实现骰子系统
2. 实现回合系统
3. 实现地产购买和升级
4. 实现过路费计算

#### 第三阶段：扩展功能（2-3周）
1. 实现卡片系统
2. 实现特殊格子
3. 添加AI玩家
4. 实现存档系统

#### 第四阶段：UI和美化（1-2周）
1. 设计并实现UI界面
2. 添加动画效果
3. 添加音效和背景音乐

#### 第五阶段：测试和优化
1. 游戏测试
2. 性能优化
3. Bug修复

### 4.5 推荐学习资源

1. **Unity官方教程**
   - https://learn.unity.com/
   - 推荐完成"Unity Essentials"系列

2. **C#基础**
   - 如果不熟悉C#，先学习基础语法
   - 推荐微软官方C#教程

3. **YouTube教程**
   - Brackeys（虽已停更，但教程质量高）
   - Code Monkey

## 五、技术选型建议

### 5.1 2D vs 3D
**推荐：2D开发**
- 大富翁4原版是2D游戏
- 2D开发对新手更友好
- 资源制作成本更低

### 5.2 UI系统
**推荐：Unity UI (uGUI)**
- Unity内置，稳定
- 学习资源丰富
- 可考虑后期引入UI Toolkit

### 5.3 数据存储
- 游戏配置：ScriptableObject
- 存档数据：JSON + PlayerPrefs 或 文件系统

### 5.4 版本控制
- 已初始化Git仓库
- 需要添加Unity的.gitignore

## 六、下一步行动

1. [ ] 安装Unity 2022.3 LTS
2. [ ] 在此目录创建Unity 2D项目
3. [ ] 设置项目文件夹结构
4. [ ] 添加Unity .gitignore
5. [ ] 创建基础单例类
6. [ ] 创建GameManager
7. [ ] 创建简单的测试场景

## 七、问题和确认

在开始实施之前，我需要确认几个问题：

1. **美术风格**：是否计划使用原版大富翁4的美术风格，还是创建新的风格？
2. **多人模式**：是否需要支持网络多人游戏，还是仅支持本地多人？
3. **平台目标**：主要针对PC、手机还是都要支持？
4. **角色数量**：计划实现多少个可选角色？
5. **地图**：是否实现多张地图？
