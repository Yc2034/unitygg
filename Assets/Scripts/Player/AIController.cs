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
    /// AI难度级别
    /// </summary>
    public enum AIDifficulty
    {
        Easy,       // 简单：随机决策
        Normal,     // 普通：基础策略
        Hard        // 困难：高级策略
    }

    /// <summary>
    /// AI控制器 - 控制AI玩家的决策
    /// </summary>
    public class AIController : MonoBehaviour
    {
        [Header("设置")]
        [SerializeField] private AIDifficulty _difficulty = AIDifficulty.Normal;
        [SerializeField] private float _decisionDelay = 1f; // 决策延迟，让玩家能看清AI的操作

        [Header("策略参数")]
        [SerializeField] private float _propertyBuyThreshold = 0.3f; // 保留多少比例的钱
        [SerializeField] private float _upgradeThreshold = 0.4f;
        [SerializeField] private float _cardUseChance = 0.5f;

        private PlayerController _player;
        private BoardManager _boardManager;
        private TurnManager _turnManager;

        public PlayerController Player => _player;
        public AIDifficulty Difficulty
        {
            get => _difficulty;
            set => _difficulty = value;
        }

        private void Awake()
        {
            _player = GetComponent<PlayerController>();
        }

        private void Start()
        {
            _boardManager = FindObjectOfType<BoardManager>();
            _turnManager = FindObjectOfType<TurnManager>();

            // 订阅回合事件
            if (_turnManager != null)
            {
                _turnManager.OnTurnStart += OnTurnStart;
            }
        }

        private void OnDestroy()
        {
            if (_turnManager != null)
            {
                _turnManager.OnTurnStart -= OnTurnStart;
            }
        }

        private void OnTurnStart(PlayerController player)
        {
            if (player == _player && _player.IsAI)
            {
                StartCoroutine(TakeTurn());
            }
        }

        /// <summary>
        /// AI执行回合
        /// </summary>
        private IEnumerator TakeTurn()
        {
            yield return new WaitForSeconds(_decisionDelay);

            // 1. 考虑是否使用卡片
            if (ShouldUseCard())
            {
                UseRandomCard();
                yield return new WaitForSeconds(_decisionDelay);
            }

            // 2. 掷骰子（由UI或GameManager触发）
            // AI自动掷骰子
            EventManager.Instance.TriggerEvent("AIRollDice", _player);

            // 等待移动完成
            while (_player.IsMoving)
            {
                yield return null;
            }

            yield return new WaitForSeconds(_decisionDelay);

            // 3. 处理格子事件（自动）
            // 格子事件会询问AI的决策

            Debug.Log($"AI {_player.PlayerName} 完成回合");
        }

        #region 决策方法

        /// <summary>
        /// 决定是否购买地产
        /// </summary>
        public bool DecideToBuyProperty(Property property)
        {
            if (property == null) return false;

            int price = property.PurchasePrice;
            int currentMoney = _player.Money;

            switch (_difficulty)
            {
                case AIDifficulty.Easy:
                    // 简单AI：随机决定
                    return Random.value > 0.5f && currentMoney >= price;

                case AIDifficulty.Normal:
                    // 普通AI：基础策略
                    return currentMoney >= price * (1 + _propertyBuyThreshold);

                case AIDifficulty.Hard:
                    // 困难AI：考虑更多因素
                    return EvaluatePropertyPurchase(property);

                default:
                    return false;
            }
        }

        /// <summary>
        /// 决定是否升级地产
        /// </summary>
        public bool DecideToUpgradeProperty(Property property)
        {
            if (property == null || !property.CanUpgrade()) return false;

            int upgradeCost = property.UpgradeCost;
            int currentMoney = _player.Money;

            switch (_difficulty)
            {
                case AIDifficulty.Easy:
                    return Random.value > 0.6f && currentMoney >= upgradeCost;

                case AIDifficulty.Normal:
                    return currentMoney >= upgradeCost * (1 + _upgradeThreshold);

                case AIDifficulty.Hard:
                    return EvaluatePropertyUpgrade(property);

                default:
                    return false;
            }
        }

        /// <summary>
        /// 高级购买评估
        /// </summary>
        private bool EvaluatePropertyPurchase(Property property)
        {
            int price = property.PurchasePrice;
            int currentMoney = _player.Money;

            // 必须能负担
            if (currentMoney < price) return false;

            // 计算投资回报
            float roi = (float)property.CurrentRent / price;

            // 检查是否能形成连片
            bool hasAdjacentProperty = CheckAdjacentOwnership(property);

            // 保留足够的现金
            float moneyAfterPurchase = currentMoney - price;
            float moneyRatio = moneyAfterPurchase / currentMoney;

            // 综合评估
            if (hasAdjacentProperty && moneyRatio > 0.2f)
            {
                return true; // 能形成连片，积极购买
            }

            if (roi > 0.1f && moneyRatio > 0.3f)
            {
                return true; // ROI高，购买
            }

            if (property.Region == PropertyRegion.Luxury && moneyRatio > 0.4f)
            {
                return true; // 豪华区，值得投资
            }

            return moneyRatio > 0.5f; // 保守购买
        }

        /// <summary>
        /// 高级升级评估
        /// </summary>
        private bool EvaluatePropertyUpgrade(Property property)
        {
            int upgradeCost = property.UpgradeCost;
            int currentMoney = _player.Money;

            if (currentMoney < upgradeCost) return false;

            // 计算升级后的收益提升
            int currentRent = property.CurrentRent;
            int nextRent = property.GetRentAtLevel(property.Level + 1);
            int rentIncrease = nextRent - currentRent;

            // 回本时间（假设每5回合收一次租）
            float paybackTurns = upgradeCost / (rentIncrease / 5f);

            // 如果10回合内能回本，值得升级
            return paybackTurns < 10 && (currentMoney - upgradeCost) > currentMoney * 0.3f;
        }

        /// <summary>
        /// 检查是否有相邻地产
        /// </summary>
        private bool CheckAdjacentOwnership(Property property)
        {
            foreach (var owned in _player.OwnedProperties)
            {
                int distance = Mathf.Abs(owned.TileIndex - property.TileIndex);
                if (distance <= 2 || distance >= _boardManager.TotalTiles - 2)
                {
                    return true;
                }
            }
            return false;
        }

        #endregion

        #region 卡片使用

        /// <summary>
        /// 决定是否使用卡片
        /// </summary>
        private bool ShouldUseCard()
        {
            if (_player.Cards.Count == 0) return false;

            switch (_difficulty)
            {
                case AIDifficulty.Easy:
                    return Random.value > 0.8f;
                case AIDifficulty.Normal:
                    return Random.value > 0.6f;
                case AIDifficulty.Hard:
                    return EvaluateCardUsage();
                default:
                    return false;
            }
        }

        /// <summary>
        /// 高级卡片使用评估
        /// </summary>
        private bool EvaluateCardUsage()
        {
            // TODO: 实现更智能的卡片使用策略
            return _player.Cards.Count > 3 || Random.value > 0.5f;
        }

        /// <summary>
        /// 使用随机卡片
        /// </summary>
        private void UseRandomCard()
        {
            if (_player.Cards.Count == 0) return;

            // 简单策略：随机选择一张卡片使用
            int index = Random.Range(0, _player.Cards.Count);
            Card card = _player.Cards[index];

            // 选择目标（如果需要）
            PlayerController target = SelectCardTarget(card);

            _player.UseCard(card, target);
        }

        /// <summary>
        /// 选择卡片目标
        /// </summary>
        private PlayerController SelectCardTarget(Card card)
        {
            if (!card.RequiresTarget) return null;

            // 选择最富有的对手
            PlayerController richestEnemy = null;
            int maxMoney = 0;

            foreach (var player in GameManager.Instance.Players)
            {
                if (player != _player && player.State != PlayerState.Bankrupt)
                {
                    if (player.Money > maxMoney)
                    {
                        maxMoney = player.Money;
                        richestEnemy = player;
                    }
                }
            }

            return richestEnemy;
        }

        #endregion

        #region 抵押和破产

        /// <summary>
        /// 当资金不足时，决定抵押哪些地产
        /// </summary>
        public List<Property> DecidePropertiesToMortgage(int amountNeeded)
        {
            List<Property> toMortgage = new List<Property>();
            int totalValue = 0;

            // 按价值从低到高排序
            List<Property> sortedProperties = new List<Property>(_player.OwnedProperties);
            sortedProperties.Sort((a, b) => a.GetTotalValue().CompareTo(b.GetTotalValue()));

            foreach (var property in sortedProperties)
            {
                if (totalValue >= amountNeeded) break;

                if (!property.IsMortgaged)
                {
                    toMortgage.Add(property);
                    totalValue += property.MortgageValue;
                }
            }

            return toMortgage;
        }

        #endregion
    }
}
