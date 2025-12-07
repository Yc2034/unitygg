using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Core;
using RichMan.Economy;

namespace RichMan.Cards.CardEffects
{
    /// <summary>
    /// 抢夺卡 - 抢夺目标玩家的金钱
    /// </summary>
    public class RobCard : Card
    {
        private int _robAmount;

        public RobCard(CardData data) : base(data)
        {
            Type = CardType.Rob;
            RequiresTarget = true;
            _robAmount = data?.EffectValue1 ?? 1000;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            int actualAmount = Mathf.Min(_robAmount, target.Money);
            if (actualAmount > 0)
            {
                target.SpendMoney(actualAmount);
                user.AddMoney(actualAmount);
                Debug.Log($"{user.PlayerName} 使用抢夺卡，从 {target.PlayerName} 抢走 ${actualAmount}");
                return true;
            }

            Debug.Log($"{target.PlayerName} 没有钱可抢！");
            return false;
        }
    }

    /// <summary>
    /// 拆除卡 - 拆除目标地产的一级建筑
    /// </summary>
    public class DemolishCard : Card
    {
        public DemolishCard(CardData data) : base(data)
        {
            Type = CardType.Demolish;
            RequiresTarget = true;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // 找到目标的一处地产进行拆除
            if (target.OwnedProperties.Count == 0)
            {
                Debug.Log($"{target.PlayerName} 没有地产可拆除！");
                return false;
            }

            // 选择等级最高的地产拆除
            Property targetProperty = null;
            int maxLevel = 0;
            foreach (var prop in target.OwnedProperties)
            {
                if (prop.Level > maxLevel)
                {
                    maxLevel = prop.Level;
                    targetProperty = prop;
                }
            }

            if (targetProperty != null && targetProperty.Level > 0)
            {
                targetProperty.Downgrade();
                Debug.Log($"{user.PlayerName} 使用拆除卡，拆除了 {target.PlayerName} 的 {targetProperty.PropertyName}");
                return true;
            }

            return false;
        }
    }

    /// <summary>
    /// 均贫卡 - 将所有玩家的金钱平均分配
    /// </summary>
    public class TaxCard : Card
    {
        public TaxCard(CardData data) : base(data)
        {
            Type = CardType.Tax;
            RequiresTarget = false;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            var players = GameManager.Instance.Players;
            int totalMoney = 0;
            int activePlayerCount = 0;

            // 计算总金额
            foreach (var player in players)
            {
                if (player.State != PlayerState.Bankrupt)
                {
                    totalMoney += player.Money;
                    activePlayerCount++;
                }
            }

            if (activePlayerCount == 0) return false;

            int averageMoney = totalMoney / activePlayerCount;

            // 重新分配
            foreach (var player in players)
            {
                if (player.State != PlayerState.Bankrupt)
                {
                    // 先清零再设置
                    int difference = averageMoney - player.Money;
                    if (difference > 0)
                    {
                        player.AddMoney(difference);
                    }
                    else if (difference < 0)
                    {
                        player.SpendMoney(-difference);
                    }
                }
            }

            Debug.Log($"{user.PlayerName} 使用均贫卡，每人分得 ${averageMoney}");
            return true;
        }
    }

    /// <summary>
    /// 定时炸弹 - 放置在地图上，经过的玩家会触发
    /// </summary>
    public class BombCard : Card
    {
        private int _damage;

        public BombCard(CardData data) : base(data)
        {
            Type = CardType.Bomb;
            RequiresTarget = false;
            _damage = data?.EffectValue1 ?? 2000;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // 在当前位置放置炸弹
            // TODO: 实现炸弹放置逻辑
            Debug.Log($"{user.PlayerName} 放置了一颗定时炸弹！");
            return true;
        }
    }
}
