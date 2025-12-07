using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Board;
using RichMan.Dice;

namespace RichMan.Cards.CardEffects
{
    /// <summary>
    /// 传送卡 - 传送到指定位置
    /// </summary>
    public class TeleportCard : Card
    {
        public TeleportCard(CardData data) : base(data)
        {
            Type = CardType.Teleport;
            RequiresTarget = false;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // TODO: 显示选择目标格子的UI
            // 这里暂时传送到起点
            user.TeleportTo(0);
            Debug.Log($"{user.PlayerName} 使用传送卡，传送到起点");
            return true;
        }

        /// <summary>
        /// 传送到指定格子
        /// </summary>
        public bool UseToTile(PlayerController user, int tileIndex)
        {
            if (user == null) return false;

            user.TeleportTo(tileIndex);
            Debug.Log($"{user.PlayerName} 使用传送卡，传送到格子 {tileIndex}");
            return true;
        }
    }

    /// <summary>
    /// 停留卡 - 让目标玩家停留在原地
    /// </summary>
    public class StayCard : Card
    {
        private int _turnsToStay;

        public StayCard(CardData data) : base(data)
        {
            Type = CardType.Stay;
            RequiresTarget = true;
            _turnsToStay = data?.EffectValue1 ?? 1;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // 设置目标需要跳过的回合数
            target.Data.TurnsToSkip += _turnsToStay;
            Debug.Log($"{user.PlayerName} 使用停留卡，{target.PlayerName} 需要停留 {_turnsToStay} 回合");
            return true;
        }
    }

    /// <summary>
    /// 转向卡 - 改变移动方向
    /// </summary>
    public class ReverseCard : Card
    {
        public ReverseCard(CardData data) : base(data)
        {
            Type = CardType.Reverse;
            RequiresTarget = true;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // TODO: 实现方向控制逻辑
            Debug.Log($"{user.PlayerName} 使用转向卡，{target.PlayerName} 下次将反向移动");
            return true;
        }
    }

    /// <summary>
    /// 遥控骰子 - 控制下次掷骰结果
    /// </summary>
    public class ControlDiceCard : Card
    {
        public ControlDiceCard(CardData data) : base(data)
        {
            Type = CardType.Control;
            RequiresTarget = false;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // TODO: 显示选择点数的UI
            // 这里暂时设置为6点
            DiceManager.Instance.SetForcedResult(6);
            Debug.Log($"{user.PlayerName} 使用遥控骰子，下次将投出指定点数");
            return true;
        }

        /// <summary>
        /// 设置指定点数
        /// </summary>
        public bool UseWithValue(PlayerController user, int value)
        {
            if (user == null) return false;

            DiceManager.Instance.SetForcedResult(value);
            Debug.Log($"{user.PlayerName} 使用遥控骰子，设置点数为 {value}");
            return true;
        }
    }

    /// <summary>
    /// 乌龟卡 - 让目标只能走1步
    /// </summary>
    public class TurtleCard : Card
    {
        public TurtleCard(CardData data) : base(data)
        {
            Type = CardType.Turtle;
            RequiresTarget = true;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            // TODO: 实现乌龟效果（限制移动距离）
            Debug.Log($"{user.PlayerName} 使用乌龟卡，{target.PlayerName} 下次只能走1步");
            return true;
        }
    }

    /// <summary>
    /// 催眠卡 - 让目标睡眠跳过回合
    /// </summary>
    public class SleepCard : Card
    {
        private int _sleepTurns;

        public SleepCard(CardData data) : base(data)
        {
            Type = CardType.Sleep;
            RequiresTarget = true;
            _sleepTurns = data?.EffectValue1 ?? 2;
        }

        public override bool Use(PlayerController user, PlayerController target = null)
        {
            if (!CanUse(user, target)) return false;

            target.Data.TurnsToSkip += _sleepTurns;
            Debug.Log($"{user.PlayerName} 使用催眠卡，{target.PlayerName} 将睡眠 {_sleepTurns} 回合");
            return true;
        }
    }
}
