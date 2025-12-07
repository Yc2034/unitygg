using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Cards.CardEffects;

namespace RichMan.Cards
{
    /// <summary>
    /// 卡片管理器 - 管理卡片的创建、分发
    /// </summary>
    public class CardManager : Singleton<CardManager>
    {
        [Header("卡片配置")]
        [SerializeField] private List<CardData> _allCardDatas = new List<CardData>();

        [Header("商店设置")]
        [SerializeField] private List<CardData> _shopCards = new List<CardData>();
        [SerializeField] private int _shopCardCount = 4; // 商店同时出售的卡片数量

        // 当前商店卡片
        private List<CardData> _currentShopCards = new List<CardData>();

        protected override void OnSingletonAwake()
        {
            RefreshShop();
        }

        #region 卡片创建

        /// <summary>
        /// 根据数据创建卡片实例
        /// </summary>
        public Card CreateCard(CardData data)
        {
            if (data == null) return null;

            switch (data.Type)
            {
                // 攻击类
                case CardType.Rob:
                    return new RobCard(data);
                case CardType.Demolish:
                    return new DemolishCard(data);
                case CardType.Tax:
                    return new TaxCard(data);
                case CardType.Bomb:
                    return new BombCard(data);

                // 移动类
                case CardType.Teleport:
                    return new TeleportCard(data);
                case CardType.Stay:
                    return new StayCard(data);
                case CardType.Reverse:
                    return new ReverseCard(data);
                case CardType.Control:
                    return new ControlDiceCard(data);
                case CardType.Turtle:
                    return new TurtleCard(data);
                case CardType.Sleep:
                    return new SleepCard(data);

                // TODO: 添加更多卡片类型

                default:
                    Debug.LogWarning($"未知的卡片类型: {data.Type}");
                    return null;
            }
        }

        /// <summary>
        /// 根据ID创建卡片
        /// </summary>
        public Card CreateCardById(string cardId)
        {
            CardData data = _allCardDatas.Find(c => c.CardId == cardId);
            return CreateCard(data);
        }

        /// <summary>
        /// 创建随机卡片
        /// </summary>
        public Card CreateRandomCard()
        {
            if (_allCardDatas.Count == 0) return null;

            int index = Random.Range(0, _allCardDatas.Count);
            return CreateCard(_allCardDatas[index]);
        }

        #endregion

        #region 卡片分发

        /// <summary>
        /// 给玩家发放随机卡片
        /// </summary>
        public bool GiveRandomCard(PlayerController player)
        {
            Card card = CreateRandomCard();
            if (card != null)
            {
                return player.AcquireCard(card);
            }
            return false;
        }

        /// <summary>
        /// 给玩家发放指定卡片
        /// </summary>
        public bool GiveCard(PlayerController player, string cardId)
        {
            Card card = CreateCardById(cardId);
            if (card != null)
            {
                return player.AcquireCard(card);
            }
            return false;
        }

        /// <summary>
        /// 给所有玩家发放初始卡片
        /// </summary>
        public void DistributeInitialCards(int cardsPerPlayer = 2)
        {
            foreach (var player in Core.GameManager.Instance.Players)
            {
                for (int i = 0; i < cardsPerPlayer; i++)
                {
                    GiveRandomCard(player);
                }
            }
        }

        #endregion

        #region 商店

        /// <summary>
        /// 刷新商店卡片
        /// </summary>
        public void RefreshShop()
        {
            _currentShopCards.Clear();

            List<CardData> available = new List<CardData>(_shopCards);

            for (int i = 0; i < _shopCardCount && available.Count > 0; i++)
            {
                int index = Random.Range(0, available.Count);
                _currentShopCards.Add(available[index]);
                available.RemoveAt(index);
            }

            Debug.Log($"商店刷新，当前有 {_currentShopCards.Count} 张卡片出售");
        }

        /// <summary>
        /// 获取当前商店卡片
        /// </summary>
        public List<CardData> GetShopCards()
        {
            return new List<CardData>(_currentShopCards);
        }

        /// <summary>
        /// 购买商店卡片
        /// </summary>
        public bool PurchaseCard(PlayerController player, int shopIndex)
        {
            if (shopIndex < 0 || shopIndex >= _currentShopCards.Count)
            {
                return false;
            }

            CardData cardData = _currentShopCards[shopIndex];

            if (!player.CanAfford(cardData.Price))
            {
                Debug.Log($"{player.PlayerName} 资金不足，无法购买 {cardData.CardName}");
                return false;
            }

            if (player.Cards.Count >= Constants.MaxCardsInHand)
            {
                Debug.Log($"{player.PlayerName} 卡片已满，无法购买");
                return false;
            }

            // 扣款
            player.SpendMoney(cardData.Price);

            // 创建并给予卡片
            Card card = CreateCard(cardData);
            player.AcquireCard(card);

            // 从商店移除
            _currentShopCards.RemoveAt(shopIndex);

            Debug.Log($"{player.PlayerName} 以 ${cardData.Price} 购买了 {cardData.CardName}");
            return true;
        }

        #endregion

        #region 查询

        /// <summary>
        /// 获取所有卡片数据
        /// </summary>
        public List<CardData> GetAllCardDatas()
        {
            return new List<CardData>(_allCardDatas);
        }

        /// <summary>
        /// 根据类型获取卡片数据
        /// </summary>
        public List<CardData> GetCardDatasByType(CardType type)
        {
            return _allCardDatas.FindAll(c => c.Type == type);
        }

        #endregion
    }
}
