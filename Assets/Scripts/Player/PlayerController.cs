using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Economy;
using RichMan.Cards;
using RichMan.Board;
using RichMan.Core;

namespace RichMan.Player
{
    /// <summary>
    /// 玩家控制器 - 管理玩家行为和状态
    /// </summary>
    public class PlayerController : MonoBehaviour
    {
        [Header("配置")]
        [SerializeField] private CharacterData _characterData;
        [SerializeField] private float _moveSpeed = 5f;
        [SerializeField] private float _moveDelay = 0.2f; // 每格移动间隔

        [Header("引用")]
        [SerializeField] private SpriteRenderer _spriteRenderer;
        [SerializeField] private Animator _animator;

        // 玩家数据
        public PlayerData Data { get; private set; } = new PlayerData();

        // 便捷属性
        public string PlayerName => Data.PlayerName;
        public int Money => Data.Money;
        public int CurrentTileIndex => Data.CurrentTileIndex;
        public PlayerState State => Data.State;
        public int TurnsToSkip => Data.TurnsToSkip;
        public bool IsAI => Data.IsAI;

        // 地产和卡片
        public List<Property> OwnedProperties { get; private set; } = new List<Property>();
        public List<Card> Cards { get; private set; } = new List<Card>();

        // 事件
        public event Action<int> OnMoneyChanged; // 参数：变化量
        public event Action<int> OnMoved; // 参数：新位置索引
        public event Action<PlayerState> OnStateChanged;
        public event Action<Property> OnPropertyAcquired;
        public event Action<Card> OnCardAcquired;

        // 移动相关
        private bool _isMoving = false;
        public bool IsMoving => _isMoving;

        private BoardManager _boardManager;
        private TurnManager _turnManager;

        private void Start()
        {
            _boardManager = FindObjectOfType<BoardManager>();
            _turnManager = FindObjectOfType<TurnManager>();

            if (_spriteRenderer == null)
                _spriteRenderer = GetComponent<SpriteRenderer>();
            if (_animator == null)
                _animator = GetComponent<Animator>();
        }

        #region 初始化

        /// <summary>
        /// 初始化玩家
        /// </summary>
        public void Initialize(int startingMoney, int playerIndex, bool isAI = false)
        {
            Data.Money = startingMoney;
            Data.PlayerIndex = playerIndex;
            Data.IsAI = isAI;
            Data.CurrentTileIndex = 0; // 起点
            Data.State = PlayerState.Normal;

            if (_characterData != null)
            {
                Data.PlayerName = _characterData.CharacterName;
                Data.PlayerColor = _characterData.ThemeColor;

                if (_spriteRenderer != null && _characterData.BoardPiece != null)
                {
                    _spriteRenderer.sprite = _characterData.BoardPiece;
                }

                if (_animator != null && _characterData.AnimatorController != null)
                {
                    _animator.runtimeAnimatorController = _characterData.AnimatorController;
                }
            }
            else
            {
                Data.PlayerName = $"Player {playerIndex + 1}";
            }

            Debug.Log($"玩家 {Data.PlayerName} 初始化完成，初始资金: {startingMoney}");
        }

        /// <summary>
        /// 设置角色数据
        /// </summary>
        public void SetCharacterData(CharacterData characterData)
        {
            _characterData = characterData;
        }

        #endregion

        #region 金钱管理

        /// <summary>
        /// 增加金钱
        /// </summary>
        public void AddMoney(int amount)
        {
            if (amount <= 0) return;

            Data.Money += amount;
            OnMoneyChanged?.Invoke(amount);
            EventManager.Instance.TriggerEvent(GameEvents.PlayerMoneyChanged, this);

            Debug.Log($"{PlayerName} 获得 ${amount}，当前余额: ${Money}");
        }

        /// <summary>
        /// 减少金钱
        /// </summary>
        /// <returns>是否成功扣款</returns>
        public bool SpendMoney(int amount)
        {
            if (amount <= 0) return true;

            if (Data.Money >= amount)
            {
                Data.Money -= amount;
                OnMoneyChanged?.Invoke(-amount);
                EventManager.Instance.TriggerEvent(GameEvents.PlayerMoneyChanged, this);
                Debug.Log($"{PlayerName} 支付 ${amount}，剩余: ${Money}");
                return true;
            }
            else
            {
                Debug.Log($"{PlayerName} 资金不足! 需要 ${amount}，当前只有 ${Money}");
                return false;
            }
        }

        /// <summary>
        /// 检查是否能负担某金额
        /// </summary>
        public bool CanAfford(int amount)
        {
            return Data.Money >= amount;
        }

        /// <summary>
        /// 向另一个玩家支付金钱
        /// </summary>
        public bool PayTo(PlayerController recipient, int amount)
        {
            if (!CanAfford(amount))
            {
                // 资金不足，可能需要抵押或破产处理
                return false;
            }

            SpendMoney(amount);
            recipient.AddMoney(amount);
            Data.TotalRentPaid += amount;
            recipient.Data.TotalRentReceived += amount;

            return true;
        }

        #endregion

        #region 移动

        /// <summary>
        /// 移动指定步数
        /// </summary>
        public void Move(int steps)
        {
            if (_isMoving) return;
            StartCoroutine(MoveCoroutine(steps));
        }

        private IEnumerator MoveCoroutine(int steps)
        {
            _isMoving = true;
            _turnManager?.SetMoving();

            // 设置行走动画
            if (_animator != null)
            {
                _animator.SetBool(Constants.AnimParamWalk, true);
            }

            int direction = steps > 0 ? 1 : -1;
            int absSteps = Mathf.Abs(steps);

            for (int i = 0; i < absSteps; i++)
            {
                Data.PreviousTileIndex = Data.CurrentTileIndex;

                // 计算下一个格子索引
                int totalTiles = _boardManager?.TotalTiles ?? 28;
                Data.CurrentTileIndex = (Data.CurrentTileIndex + direction + totalTiles) % totalTiles;

                // 检查是否经过起点
                if (direction > 0 && Data.CurrentTileIndex == 0)
                {
                    OnPassStart();
                }

                // 移动到格子位置
                Vector3 targetPosition = _boardManager?.GetTilePosition(Data.CurrentTileIndex) ?? transform.position;
                yield return StartCoroutine(MoveToPosition(targetPosition));

                // 经过格子事件（不是最后一步）
                if (i < absSteps - 1)
                {
                    Tile currentTile = _boardManager?.GetTile(Data.CurrentTileIndex);
                    currentTile?.OnPlayerPass(this);
                }

                yield return new WaitForSeconds(_moveDelay);
            }

            // 停止行走动画
            if (_animator != null)
            {
                _animator.SetBool(Constants.AnimParamWalk, false);
            }

            _isMoving = false;
            OnMoved?.Invoke(Data.CurrentTileIndex);

            // 到达格子事件
            _turnManager?.SetOnTile();
            Tile landedTile = _boardManager?.GetTile(Data.CurrentTileIndex);
            landedTile?.OnPlayerLand(this);

            EventManager.Instance.TriggerEvent(GameEvents.PlayerLandedOnTile, this);
        }

        private IEnumerator MoveToPosition(Vector3 targetPosition)
        {
            while (Vector3.Distance(transform.position, targetPosition) > 0.01f)
            {
                transform.position = Vector3.MoveTowards(
                    transform.position,
                    targetPosition,
                    _moveSpeed * Time.deltaTime
                );
                yield return null;
            }
            transform.position = targetPosition;
        }

        /// <summary>
        /// 传送到指定格子（不触发经过事件）
        /// </summary>
        public void TeleportTo(int tileIndex)
        {
            Data.PreviousTileIndex = Data.CurrentTileIndex;
            Data.CurrentTileIndex = tileIndex;

            Vector3 targetPosition = _boardManager?.GetTilePosition(tileIndex) ?? transform.position;
            transform.position = targetPosition;

            OnMoved?.Invoke(Data.CurrentTileIndex);
        }

        private void OnPassStart()
        {
            Data.TimesPassedStart++;
            AddMoney(Constants.SalaryOnPassStart);
            Debug.Log($"{PlayerName} 经过起点，获得工资 ${Constants.SalaryOnPassStart}");
        }

        #endregion

        #region 状态管理

        /// <summary>
        /// 设置玩家状态
        /// </summary>
        public void SetState(PlayerState newState)
        {
            if (Data.State == newState) return;

            PlayerState oldState = Data.State;
            Data.State = newState;
            OnStateChanged?.Invoke(newState);

            Debug.Log($"{PlayerName} 状态变更: {oldState} -> {newState}");
        }

        /// <summary>
        /// 送入监狱
        /// </summary>
        public void SendToJail(int turns = 3)
        {
            SetState(PlayerState.InJail);
            Data.TurnsToSkip = turns;

            // 传送到监狱格子
            int jailTileIndex = _boardManager?.GetTileIndexByType(TileType.Prison) ?? -1;
            if (jailTileIndex >= 0)
            {
                TeleportTo(jailTileIndex);
            }

            EventManager.Instance.TriggerEvent(GameEvents.PlayerJailed, this);
            Debug.Log($"{PlayerName} 被送入监狱，需要停留 {turns} 回合");
        }

        /// <summary>
        /// 送入医院
        /// </summary>
        public void SendToHospital(int turns = 2)
        {
            SetState(PlayerState.InHospital);
            Data.TurnsToSkip = turns;

            int hospitalTileIndex = _boardManager?.GetTileIndexByType(TileType.Hospital) ?? -1;
            if (hospitalTileIndex >= 0)
            {
                TeleportTo(hospitalTileIndex);
            }

            EventManager.Instance.TriggerEvent(GameEvents.PlayerHospitalized, this);
            Debug.Log($"{PlayerName} 被送入医院，需要休养 {turns} 回合");
        }

        /// <summary>
        /// 减少跳过回合数
        /// </summary>
        public void DecrementTurnsToSkip()
        {
            if (Data.TurnsToSkip > 0)
            {
                Data.TurnsToSkip--;
            }
        }

        /// <summary>
        /// 宣告破产
        /// </summary>
        public void DeclareBankruptcy()
        {
            SetState(PlayerState.Bankrupt);

            // 释放所有地产
            foreach (var property in OwnedProperties)
            {
                property.SetOwner(null);
            }
            OwnedProperties.Clear();
            Cards.Clear();

            EventManager.Instance.TriggerEvent(GameEvents.PlayerBankrupt, this);
            GameManager.Instance.RemovePlayer(this);

            Debug.Log($"{PlayerName} 破产了!");
        }

        #endregion

        #region 地产管理

        /// <summary>
        /// 获得地产
        /// </summary>
        public void AcquireProperty(Property property)
        {
            if (property == null || OwnedProperties.Contains(property)) return;

            OwnedProperties.Add(property);
            Data.OwnedPropertyIndices.Add(property.TileIndex);
            property.SetOwner(this);

            OnPropertyAcquired?.Invoke(property);
            Data.TotalTilesPurchased++;

            Debug.Log($"{PlayerName} 获得地产: {property.PropertyName}");
        }

        /// <summary>
        /// 失去地产
        /// </summary>
        public void LoseProperty(Property property)
        {
            if (property == null || !OwnedProperties.Contains(property)) return;

            OwnedProperties.Remove(property);
            Data.OwnedPropertyIndices.Remove(property.TileIndex);
        }

        /// <summary>
        /// 检查是否拥有指定地产
        /// </summary>
        public bool OwnsProperty(Property property)
        {
            return OwnedProperties.Contains(property);
        }

        #endregion

        #region 卡片管理

        /// <summary>
        /// 获得卡片
        /// </summary>
        public bool AcquireCard(Card card)
        {
            if (card == null) return false;

            if (Cards.Count >= Constants.MaxCardsInHand)
            {
                Debug.Log($"{PlayerName} 卡片已满，无法获得更多卡片");
                return false;
            }

            Cards.Add(card);
            Data.CardIds.Add(card.CardId);
            card.SetOwner(this);

            OnCardAcquired?.Invoke(card);
            Debug.Log($"{PlayerName} 获得卡片: {card.CardName}");
            return true;
        }

        /// <summary>
        /// 使用卡片
        /// </summary>
        public bool UseCard(Card card, PlayerController target = null)
        {
            if (card == null || !Cards.Contains(card)) return false;

            bool success = card.Use(this, target);
            if (success)
            {
                Cards.Remove(card);
                Data.CardIds.Remove(card.CardId);
                EventManager.Instance.TriggerEvent(GameEvents.CardUsed, card);
            }

            return success;
        }

        /// <summary>
        /// 移除卡片（不使用）
        /// </summary>
        public void RemoveCard(Card card)
        {
            if (card == null || !Cards.Contains(card)) return;

            Cards.Remove(card);
            Data.CardIds.Remove(card.CardId);
        }

        #endregion
    }
}
