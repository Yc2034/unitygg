using System;
using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Economy;
using RichMan.Cards;

namespace RichMan.Player
{
    /// <summary>
    /// 玩家数据类 - 存储玩家的所有数据
    /// </summary>
    [Serializable]
    public class PlayerData
    {
        // 基本信息
        public string PlayerName;
        public int PlayerIndex;
        public Color PlayerColor;
        public bool IsAI;

        // 资金
        public int Money;
        public int TotalAssets; // 总资产 = 现金 + 地产价值

        // 位置
        public int CurrentTileIndex;
        public int PreviousTileIndex;

        // 状态
        public PlayerState State;
        public int TurnsToSkip; // 需要跳过的回合数

        // 地产
        public List<int> OwnedPropertyIndices = new List<int>();

        // 卡片
        public List<string> CardIds = new List<string>(); // 存储卡片ID用于序列化

        // 统计数据
        public int TotalRentPaid;
        public int TotalRentReceived;
        public int TotalTilesPurchased;
        public int TimesPassedStart;

        public PlayerData()
        {
            State = PlayerState.Normal;
            TurnsToSkip = 0;
        }

        /// <summary>
        /// 计算总资产
        /// </summary>
        public void CalculateTotalAssets(List<Property> ownedProperties)
        {
            TotalAssets = Money;
            foreach (var property in ownedProperties)
            {
                TotalAssets += property.GetTotalValue();
            }
        }

        /// <summary>
        /// 创建数据副本（用于存档）
        /// </summary>
        public PlayerData Clone()
        {
            PlayerData clone = new PlayerData
            {
                PlayerName = PlayerName,
                PlayerIndex = PlayerIndex,
                PlayerColor = PlayerColor,
                IsAI = IsAI,
                Money = Money,
                TotalAssets = TotalAssets,
                CurrentTileIndex = CurrentTileIndex,
                PreviousTileIndex = PreviousTileIndex,
                State = State,
                TurnsToSkip = TurnsToSkip,
                TotalRentPaid = TotalRentPaid,
                TotalRentReceived = TotalRentReceived,
                TotalTilesPurchased = TotalTilesPurchased,
                TimesPassedStart = TimesPassedStart
            };

            clone.OwnedPropertyIndices = new List<int>(OwnedPropertyIndices);
            clone.CardIds = new List<string>(CardIds);

            return clone;
        }
    }

    /// <summary>
    /// 角色配置数据（ScriptableObject）
    /// </summary>
    [CreateAssetMenu(fileName = "NewCharacter", menuName = "RichMan/Character Data")]
    public class CharacterData : ScriptableObject
    {
        [Header("基本信息")]
        public string CharacterName;
        public string Description;
        public Sprite Portrait;
        public Sprite BoardPiece; // 棋盘上的棋子图像
        public Color ThemeColor;

        [Header("动画")]
        public RuntimeAnimatorController AnimatorController;

        [Header("音效")]
        public AudioClip VoiceClip; // 角色语音
        public AudioClip WinVoice;
        public AudioClip LoseVoice;

        [Header("特殊能力（可选）")]
        public float RentDiscount = 0f; // 过路费折扣百分比
        public float PurchaseDiscount = 0f; // 购买折扣百分比
        public int ExtraDiceChance = 0; // 额外掷骰机会百分比
    }
}
