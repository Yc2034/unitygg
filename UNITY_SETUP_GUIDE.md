# Unity 设置指南

本指南将帮助你在Unity中设置大富翁4游戏项目。

## 目录
1. [准备工作](#1-准备工作)
2. [创建Unity项目](#2-创建unity项目)
3. [使用自动设置工具](#3-使用自动设置工具)
4. [手动设置步骤](#4-手动设置步骤)
5. [测试游戏](#5-测试游戏)
6. [常见问题](#6-常见问题)

---

## 1. 准备工作

### 1.1 安装Unity

1. 下载 Unity Hub：https://unity.com/download
2. 安装 Unity Hub
3. 在 Unity Hub 中登录/创建 Unity 账号
4. 点击 "Installs" -> "Install Editor"
5. 选择 **Unity 2022.3 LTS**（长期支持版）
6. 在模块选择中确保勾选：
   - ✅ Microsoft Visual Studio Community（如果没有IDE）
   - ✅ Documentation（可选）

### 1.2 安装TextMeshPro

项目使用TextMeshPro进行文字渲染，首次使用时需要导入：
1. 打开Unity项目后，会自动弹出TMP导入窗口
2. 点击 "Import TMP Essentials"
3. 可选择导入 "Import TMP Examples & Extras"

---

## 2. 创建Unity项目

### 方法A：直接打开现有文件夹（推荐）

1. 打开 Unity Hub
2. 点击 "Add" -> "Add project from disk"
3. 选择 `/Users/speiyao/Documents/GitHub/unitygg` 文件夹
4. Unity会识别这是一个现有项目并打开

### 方法B：创建新项目后导入代码

1. 在 Unity Hub 中点击 "New Project"
2. 选择 "2D" 模板
3. 项目名称：`RichMan4`
4. 位置：选择一个新的文件夹
5. 创建后，将本仓库的 `Assets` 文件夹内容复制到新项目的 `Assets` 文件夹

---

## 3. 使用自动设置工具

项目包含了自动设置工具，可以快速创建所需资源。

### 3.1 打开设置窗口

在Unity顶部菜单栏中：
```
RichMan -> Game Setup Window
```

### 3.2 一键创建所有资源

1. 点击 **"一键创建所有基础资源"** 按钮
2. 这将自动创建：
   - 所有场景（MainMenu, Game, Loading）
   - 管理器预制体
   - 格子预制体
   - 玩家预制体
   - 示例角色配置
   - 示例卡片配置
   - 示例地图配置

### 3.3 场景设置工具

在Unity顶部菜单栏中：
```
RichMan -> Scene Setup Window
```

#### 设置Game场景：
1. 打开 `Assets/Scenes/Game.unity`
2. 在场景设置窗口中点击 **"一键设置Game场景"**

#### 设置MainMenu场景：
1. 打开 `Assets/Scenes/MainMenu.unity`
2. 在场景设置窗口中点击 **"一键设置MainMenu场景"**

---

## 4. 手动设置步骤

如果你想了解每个步骤或自动工具出现问题，可以手动设置。

### 4.1 创建场景

1. 在Project面板中右键 -> Create -> Scene
2. 命名为 `MainMenu`，保存到 `Assets/Scenes/`
3. 重复创建 `Game` 和 `Loading` 场景

### 4.2 设置Game场景

#### 步骤1：设置摄像机
1. 选中 Hierarchy 中的 Main Camera
2. 在 Inspector 中设置：
   - Projection: Orthographic
   - Size: 8
   - Position: (5, 5, -10)
   - Background: 深蓝灰色

#### 步骤2：创建管理器对象
1. 创建空对象，命名为 "--- Managers ---"
2. 在其下创建子对象：

| 对象名称 | 添加的脚本组件 |
|---------|--------------|
| GameManager | GameManager |
| TurnManager | TurnManager |
| BoardManager | BoardManager |
| DiceManager | DiceManager |
| CardManager | CardManager |
| AudioManager | AudioManager |
| EventManager | EventManager |
| Bank | Bank |

#### 步骤3：创建UI Canvas
1. 右键 Hierarchy -> UI -> Canvas
2. 命名为 "GameCanvas"
3. Canvas设置：
   - Render Mode: Screen Space - Overlay
   - 添加 Canvas Scaler 组件
   - UI Scale Mode: Scale With Screen Size
   - Reference Resolution: 1920 x 1080

#### 步骤4：创建UI面板
在Canvas下创建以下结构：
```
GameCanvas
├── UIManager (添加 UIManager 脚本)
├── GameUI (添加 GameUI 脚本 + CanvasGroup)
│   ├── TurnInfo
│   │   ├── TurnNumberText (TextMeshPro)
│   │   └── CurrentPlayerText (TextMeshPro)
│   ├── DiceArea
│   │   ├── RollDiceButton (Button)
│   │   └── DiceResultText (TextMeshPro)
│   └── ActionButtons
│       ├── UseCardButton (Button)
│       └── EndTurnButton (Button)
├── PlayerInfoUI (添加 PlayerInfoUI 脚本 + CanvasGroup)
├── DialogUI (添加 DialogUI 脚本 + CanvasGroup)
└── PauseMenuUI (添加 PauseMenuUI 脚本 + CanvasGroup)
```

### 4.3 创建预制体

#### 格子预制体
1. 在Hierarchy中创建空对象
2. 添加组件：
   - SpriteRenderer
   - BoxCollider2D
   - 对应的Tile脚本（如PropertyTile）
3. 拖拽到 `Assets/Prefabs/Tiles/` 创建预制体

#### 玩家预制体
1. 创建空对象 "Player"
2. 添加组件：
   - SpriteRenderer
   - PlayerController
   - Animator
3. 保存为预制体

### 4.4 创建ScriptableObject配置

#### 创建角色配置
1. Project面板中右键
2. Create -> RichMan -> Character Data
3. 填写角色信息

#### 创建卡片配置
1. Project面板中右键
2. Create -> RichMan -> Card Data
3. 填写卡片信息

---

## 5. 测试游戏

### 5.1 添加场景到Build Settings

1. File -> Build Settings
2. 点击 "Add Open Scenes" 或拖拽场景到列表
3. 确保场景顺序为：
   - 0: MainMenu
   - 1: Game
   - 2: Loading

### 5.2 运行测试

1. 打开 Game 场景
2. 点击 Play 按钮
3. 检查Console是否有错误

### 5.3 测试流程

1. 在BoardManager上设置棋盘参数
2. 运行游戏，检查棋盘是否正确生成
3. 测试骰子功能
4. 测试玩家移动

---

## 6. 常见问题

### Q: 脚本编译错误
**A:**
- 确保安装了 TextMeshPro（Window -> TextMeshPro -> Import TMP Essential Resources）
- 检查是否缺少命名空间引用

### Q: 找不到RichMan菜单
**A:**
- 等待Unity编译完成
- 检查是否有编译错误
- 确保Editor脚本在 `Assets/Scripts/Editor/` 文件夹中

### Q: UI不显示
**A:**
- 检查Canvas的Render Mode
- 确保UI对象是Canvas的子对象
- 检查CanvasGroup的Alpha值

### Q: 格子不显示
**A:**
- 检查SpriteRenderer是否有颜色
- 检查摄像机位置和大小
- 确保格子在摄像机视野内

### Q: 点击无响应
**A:**
- 检查是否有EventSystem
- 检查Button组件的Interactable
- 检查是否有遮挡的UI元素

---

## 下一步

完成基础设置后，你可以：

1. **添加美术资源**
   - 为格子添加精灵图片
   - 为角色添加动画
   - 设计UI界面

2. **配置游戏数据**
   - 创建更多角色
   - 设计卡片效果
   - 调整游戏平衡

3. **测试和调试**
   - 测试完整游戏流程
   - 调试AI行为
   - 优化性能

如有问题，请查看控制台输出的错误信息，或参考 [PLAN.md](PLAN.md) 中的架构设计文档。
