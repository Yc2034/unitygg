namespace RichMan.Utils
{
    /// <summary>
    /// 游戏常量定义
    /// </summary>
    public static class Constants
    {
        // 游戏基础设置
        public const int MaxPlayers = 4;
        public const int MinPlayers = 2;
        public const int StartingMoney = 50000;
        public const int SalaryOnPassStart = 2000;

        // 骰子设置
        public const int MinDiceValue = 1;
        public const int MaxDiceValue = 6;
        public const int DiceCount = 1; // 可以改为2实现双骰子

        // 地产设置
        public const int MaxPropertyLevel = 3; // 最高可升级到3级（平房->楼房->旅馆）
        public const float RentMultiplierLevel1 = 1.0f;
        public const float RentMultiplierLevel2 = 2.0f;
        public const float RentMultiplierLevel3 = 4.0f;

        // 卡片设置
        public const int MaxCardsInHand = 6;

        // 场景名称
        public const string SceneMainMenu = "MainMenu";
        public const string SceneGame = "Game";
        public const string SceneLoading = "Loading";

        // 动画参数名
        public const string AnimParamWalk = "IsWalking";
        public const string AnimParamIdle = "IsIdle";
        public const string AnimParamHappy = "IsHappy";
        public const string AnimParamSad = "IsSad";

        // PlayerPrefs键
        public const string PrefKeyBGMVolume = "BGMVolume";
        public const string PrefKeySFXVolume = "SFXVolume";
        public const string PrefKeySaveData = "SaveData";

        // 标签
        public const string TagPlayer = "Player";
        public const string TagTile = "Tile";

        // 层级
        public const string LayerDefault = "Default";
        public const string LayerUI = "UI";
    }

    /// <summary>
    /// 游戏状态枚举
    /// </summary>
    public enum GameState
    {
        MainMenu,       // 主菜单
        Loading,        // 加载中
        Playing,        // 游戏进行中
        Paused,         // 暂停
        GameOver        // 游戏结束
    }

    /// <summary>
    /// 回合状态枚举
    /// </summary>
    public enum TurnState
    {
        WaitingForDice, // 等待掷骰子
        Rolling,        // 掷骰中
        Moving,         // 移动中
        OnTile,         // 在格子上处理事件
        UsingCard,      // 使用卡片中
        TurnEnd         // 回合结束
    }

    /// <summary>
    /// 玩家状态枚举
    /// </summary>
    public enum PlayerState
    {
        Normal,         // 正常
        InJail,         // 在监狱中
        InHospital,     // 在医院中
        Bankrupt        // 破产
    }

    /// <summary>
    /// 格子类型枚举
    /// </summary>
    public enum TileType
    {
        Start,          // 起点
        Property,       // 地产
        Chance,         // 机会
        Fate,           // 命运
        Bank,           // 银行
        Shop,           // 商店
        News,           // 新闻站
        Lottery,        // 彩票站
        Hospital,       // 医院
        Prison,         // 监狱
        Park,           // 公园（免费停车）
        Tax             // 缴税
    }

    /// <summary>
    /// 卡片类型枚举
    /// </summary>
    public enum CardType
    {
        // 攻击类
        Rob,            // 抢夺卡
        Demolish,       // 拆除卡
        Tax,            // 均贫卡
        Bomb,           // 定时炸弹

        // 防御类
        Shield,         // 免罪卡
        Insurance,      // 保险卡

        // 移动类
        Teleport,       // 传送卡
        Stay,           // 停留卡
        Reverse,        // 转向卡

        // 控制类
        Control,        // 遥控骰子
        Sleep,          // 催眠卡
        Turtle,         // 乌龟卡（让对手只能走1步）

        // 经济类
        RedCard,        // 红卡（涨价）
        BlackCard,      // 黑卡（降价）
        Loan            // 借据卡
    }

    /// <summary>
    /// 地产区域枚举（影响价格和租金）
    /// </summary>
    public enum PropertyRegion
    {
        Suburb,         // 郊区
        Downtown,       // 市区
        Commercial,     // 商业区
        Luxury          // 豪华区
    }
}
