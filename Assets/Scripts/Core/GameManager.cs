using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Board;

namespace RichMan.Core
{
    /// <summary>
    /// 游戏管理器 - 游戏的核心控制器
    /// 负责管理游戏状态、玩家、回合等
    /// </summary>
    public class GameManager : Singleton<GameManager>
    {
        [Header("游戏设置")]
        [SerializeField] private int _startingMoney = Constants.StartingMoney;
        [SerializeField] private int _maxPlayers = Constants.MaxPlayers;

        [Header("引用")]
        [SerializeField] private BoardManager _boardManager;
        [SerializeField] private TurnManager _turnManager;

        // 游戏状态
        public GameState CurrentState { get; private set; } = GameState.MainMenu;
        public bool IsGameRunning => CurrentState == GameState.Playing;

        // 玩家管理
        public List<PlayerController> Players { get; private set; } = new List<PlayerController>();
        public PlayerController CurrentPlayer => _turnManager?.CurrentPlayer;
        public int CurrentPlayerIndex => _turnManager?.CurrentPlayerIndex ?? 0;

        // 事件
        public event Action<GameState> OnGameStateChanged;
        public event Action OnGameStart;
        public event Action<PlayerController> OnGameOver; // 参数为获胜者
        public event Action<PlayerController> OnPlayerBankrupt;

        protected override void OnSingletonAwake()
        {
            // 初始化时可以加载配置等
        }

        private void Start()
        {
            // 如果需要自动查找引用
            if (_boardManager == null)
                _boardManager = FindObjectOfType<BoardManager>();
            if (_turnManager == null)
                _turnManager = FindObjectOfType<TurnManager>();
        }

        #region 游戏流程控制

        /// <summary>
        /// 初始化新游戏
        /// </summary>
        /// <param name="playerCount">玩家数量</param>
        /// <param name="aiCount">AI数量</param>
        public void InitializeGame(int playerCount, int aiCount)
        {
            if (playerCount + aiCount < Constants.MinPlayers ||
                playerCount + aiCount > Constants.MaxPlayers)
            {
                Debug.LogError($"玩家数量必须在{Constants.MinPlayers}到{Constants.MaxPlayers}之间");
                return;
            }

            Players.Clear();
            ChangeState(GameState.Loading);

            // TODO: 创建玩家和AI
            Debug.Log($"初始化游戏: {playerCount}个玩家, {aiCount}个AI");
        }

        /// <summary>
        /// 开始游戏
        /// </summary>
        public void StartGame()
        {
            if (Players.Count < Constants.MinPlayers)
            {
                Debug.LogError("玩家数量不足，无法开始游戏");
                return;
            }

            ChangeState(GameState.Playing);
            _turnManager?.StartFirstTurn();
            OnGameStart?.Invoke();

            Debug.Log("游戏开始!");
        }

        /// <summary>
        /// 暂停游戏
        /// </summary>
        public void PauseGame()
        {
            if (CurrentState != GameState.Playing) return;

            ChangeState(GameState.Paused);
            Time.timeScale = 0f;
            Debug.Log("游戏暂停");
        }

        /// <summary>
        /// 继续游戏
        /// </summary>
        public void ResumeGame()
        {
            if (CurrentState != GameState.Paused) return;

            ChangeState(GameState.Playing);
            Time.timeScale = 1f;
            Debug.Log("游戏继续");
        }

        /// <summary>
        /// 结束游戏
        /// </summary>
        /// <param name="winner">获胜者</param>
        public void EndGame(PlayerController winner = null)
        {
            ChangeState(GameState.GameOver);
            Time.timeScale = 1f;
            OnGameOver?.Invoke(winner);

            Debug.Log(winner != null ? $"游戏结束! 获胜者: {winner.PlayerName}" : "游戏结束!");
        }

        /// <summary>
        /// 返回主菜单
        /// </summary>
        public void ReturnToMainMenu()
        {
            Time.timeScale = 1f;
            ChangeState(GameState.MainMenu);
            SceneManager.LoadScene(Constants.SceneMainMenu);
        }

        private void ChangeState(GameState newState)
        {
            if (CurrentState == newState) return;

            GameState oldState = CurrentState;
            CurrentState = newState;
            OnGameStateChanged?.Invoke(newState);

            Debug.Log($"游戏状态变更: {oldState} -> {newState}");
        }

        #endregion

        #region 玩家管理

        /// <summary>
        /// 添加玩家到游戏
        /// </summary>
        public void AddPlayer(PlayerController player)
        {
            if (Players.Count >= _maxPlayers)
            {
                Debug.LogWarning("已达到最大玩家数量");
                return;
            }

            Players.Add(player);
            player.Initialize(_startingMoney, Players.Count - 1);
            Debug.Log($"玩家 {player.PlayerName} 加入游戏");
        }

        /// <summary>
        /// 移除玩家（破产或退出）
        /// </summary>
        public void RemovePlayer(PlayerController player)
        {
            if (!Players.Contains(player)) return;

            Players.Remove(player);
            OnPlayerBankrupt?.Invoke(player);

            // 检查游戏是否结束
            int activePlayers = GetActivePlayerCount();
            if (activePlayers <= 1)
            {
                PlayerController winner = Players.Find(p => p.State != PlayerState.Bankrupt);
                EndGame(winner);
            }
        }

        /// <summary>
        /// 获取活跃玩家数量（未破产）
        /// </summary>
        public int GetActivePlayerCount()
        {
            int count = 0;
            foreach (var player in Players)
            {
                if (player.State != PlayerState.Bankrupt)
                    count++;
            }
            return count;
        }

        /// <summary>
        /// 通过索引获取玩家
        /// </summary>
        public PlayerController GetPlayer(int index)
        {
            if (index < 0 || index >= Players.Count)
                return null;
            return Players[index];
        }

        #endregion

        #region 存档相关

        /// <summary>
        /// 保存游戏
        /// </summary>
        public void SaveGame()
        {
            // TODO: 实现存档逻辑
            Debug.Log("保存游戏...");
        }

        /// <summary>
        /// 加载游戏
        /// </summary>
        public void LoadGame()
        {
            // TODO: 实现读档逻辑
            Debug.Log("加载游戏...");
        }

        #endregion
    }
}
