using System;
using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Core
{
    /// <summary>
    /// 回合管理器 - 管理游戏回合流程
    /// </summary>
    public class TurnManager : MonoBehaviour
    {
        [Header("设置")]
        [SerializeField] private float _turnTransitionDelay = 1f;

        // 回合状态
        public TurnState CurrentTurnState { get; private set; } = TurnState.WaitingForDice;
        public int CurrentPlayerIndex { get; private set; } = 0;
        public int TurnNumber { get; private set; } = 0;
        public PlayerController CurrentPlayer => GetCurrentPlayer();

        // 事件
        public event Action<PlayerController> OnTurnStart;
        public event Action<PlayerController> OnTurnEnd;
        public event Action<TurnState> OnTurnStateChanged;
        public event Action<int> OnNewRound; // 新的一轮（所有玩家都走完一次）

        private GameManager _gameManager;

        private void Awake()
        {
            _gameManager = GameManager.Instance;
        }

        #region 回合控制

        /// <summary>
        /// 开始第一个回合
        /// </summary>
        public void StartFirstTurn()
        {
            CurrentPlayerIndex = 0;
            TurnNumber = 1;
            StartTurn();
        }

        /// <summary>
        /// 开始当前玩家的回合
        /// </summary>
        public void StartTurn()
        {
            if (!_gameManager.IsGameRunning) return;

            PlayerController player = CurrentPlayer;
            if (player == null || player.State == PlayerState.Bankrupt)
            {
                // 跳过破产玩家
                NextPlayer();
                return;
            }

            // 检查玩家是否被困（监狱/医院）
            if (player.State == PlayerState.InJail || player.State == PlayerState.InHospital)
            {
                player.DecrementTurnsToSkip();
                if (player.TurnsToSkip > 0)
                {
                    Debug.Log($"{player.PlayerName} 需要跳过回合，剩余 {player.TurnsToSkip} 回合");
                    EndTurn();
                    return;
                }
                else
                {
                    player.SetState(PlayerState.Normal);
                }
            }

            ChangeTurnState(TurnState.WaitingForDice);
            OnTurnStart?.Invoke(player);
            Debug.Log($"=== 第{TurnNumber}回合 - {player.PlayerName}的回合 ===");
        }

        /// <summary>
        /// 结束当前回合
        /// </summary>
        public void EndTurn()
        {
            if (!_gameManager.IsGameRunning) return;

            PlayerController player = CurrentPlayer;
            ChangeTurnState(TurnState.TurnEnd);
            OnTurnEnd?.Invoke(player);

            Debug.Log($"{player?.PlayerName ?? "未知"} 的回合结束");

            // 延迟后切换到下一个玩家
            Invoke(nameof(NextPlayer), _turnTransitionDelay);
        }

        /// <summary>
        /// 切换到下一个玩家
        /// </summary>
        public void NextPlayer()
        {
            int startIndex = CurrentPlayerIndex;
            int playerCount = _gameManager.Players.Count;

            do
            {
                CurrentPlayerIndex = (CurrentPlayerIndex + 1) % playerCount;

                // 检查是否新的一轮
                if (CurrentPlayerIndex == 0)
                {
                    TurnNumber++;
                    OnNewRound?.Invoke(TurnNumber);
                }

                // 找到一个未破产的玩家
                PlayerController nextPlayer = _gameManager.GetPlayer(CurrentPlayerIndex);
                if (nextPlayer != null && nextPlayer.State != PlayerState.Bankrupt)
                {
                    StartTurn();
                    return;
                }

            } while (CurrentPlayerIndex != startIndex);

            // 如果循环了一圈都没找到活跃玩家，游戏应该已经结束了
            Debug.LogWarning("没有找到活跃玩家");
        }

        /// <summary>
        /// 强制跳转到指定玩家
        /// </summary>
        public void SetCurrentPlayer(int playerIndex)
        {
            if (playerIndex < 0 || playerIndex >= _gameManager.Players.Count)
            {
                Debug.LogError("无效的玩家索引");
                return;
            }

            CurrentPlayerIndex = playerIndex;
            StartTurn();
        }

        #endregion

        #region 回合状态管理

        /// <summary>
        /// 设置回合状态为掷骰中
        /// </summary>
        public void SetRolling()
        {
            ChangeTurnState(TurnState.Rolling);
        }

        /// <summary>
        /// 设置回合状态为移动中
        /// </summary>
        public void SetMoving()
        {
            ChangeTurnState(TurnState.Moving);
        }

        /// <summary>
        /// 设置回合状态为处理格子事件
        /// </summary>
        public void SetOnTile()
        {
            ChangeTurnState(TurnState.OnTile);
        }

        /// <summary>
        /// 设置回合状态为使用卡片
        /// </summary>
        public void SetUsingCard()
        {
            ChangeTurnState(TurnState.UsingCard);
        }

        /// <summary>
        /// 设置回合状态为等待掷骰
        /// </summary>
        public void SetWaitingForDice()
        {
            ChangeTurnState(TurnState.WaitingForDice);
        }

        private void ChangeTurnState(TurnState newState)
        {
            if (CurrentTurnState == newState) return;

            TurnState oldState = CurrentTurnState;
            CurrentTurnState = newState;
            OnTurnStateChanged?.Invoke(newState);

            Debug.Log($"回合状态: {oldState} -> {newState}");
        }

        #endregion

        #region 辅助方法

        private PlayerController GetCurrentPlayer()
        {
            return _gameManager?.GetPlayer(CurrentPlayerIndex);
        }

        /// <summary>
        /// 检查是否轮到指定玩家
        /// </summary>
        public bool IsPlayerTurn(PlayerController player)
        {
            return CurrentPlayer == player && _gameManager.IsGameRunning;
        }

        /// <summary>
        /// 检查当前是否可以掷骰子
        /// </summary>
        public bool CanRollDice()
        {
            return CurrentTurnState == TurnState.WaitingForDice && _gameManager.IsGameRunning;
        }

        /// <summary>
        /// 检查当前是否可以使用卡片
        /// </summary>
        public bool CanUseCard()
        {
            return (CurrentTurnState == TurnState.WaitingForDice ||
                    CurrentTurnState == TurnState.OnTile) &&
                   _gameManager.IsGameRunning;
        }

        #endregion
    }
}
