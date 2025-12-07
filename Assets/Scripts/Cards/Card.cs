using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Cards
{
    /// <summary>
    /// 卡片基类
    /// </summary>
    public abstract class Card
    {
        public string CardId { get; protected set; }
        public string CardName { get; protected set; }
        public string Description { get; protected set; }
        public CardType Type { get; protected set; }
        public Sprite CardSprite { get; protected set; }
        public bool RequiresTarget { get; protected set; }
        public int Price { get; protected set; }

        protected PlayerController _owner;

        public Card(CardData data)
        {
            if (data != null)
            {
                CardId = data.CardId;
                CardName = data.CardName;
                Description = data.Description;
                Type = data.Type;
                CardSprite = data.CardSprite;
                RequiresTarget = data.RequiresTarget;
                Price = data.Price;
            }
        }

        /// <summary>
        /// 设置卡片所有者
        /// </summary>
        public void SetOwner(PlayerController owner)
        {
            _owner = owner;
        }

        /// <summary>
        /// 使用卡片
        /// </summary>
        /// <param name="user">使用者</param>
        /// <param name="target">目标（可选）</param>
        /// <returns>是否使用成功</returns>
        public abstract bool Use(PlayerController user, PlayerController target = null);

        /// <summary>
        /// 检查是否可以使用
        /// </summary>
        public virtual bool CanUse(PlayerController user, PlayerController target = null)
        {
            if (user == null) return false;
            if (RequiresTarget && target == null) return false;
            if (RequiresTarget && target == user) return false;
            return true;
        }

        /// <summary>
        /// 获取卡片信息
        /// </summary>
        public virtual string GetInfo()
        {
            return $"{CardName}\n{Description}";
        }
    }

    /// <summary>
    /// 卡片数据配置
    /// </summary>
    [CreateAssetMenu(fileName = "NewCardData", menuName = "RichMan/Card Data")]
    public class CardData : ScriptableObject
    {
        public string CardId;
        public string CardName;
        [TextArea] public string Description;
        public CardType Type;
        public Sprite CardSprite;
        public bool RequiresTarget;
        public int Price; // 商店购买价格

        [Header("效果参数")]
        public int EffectValue1;
        public int EffectValue2;
        public float EffectMultiplier;
    }
}
