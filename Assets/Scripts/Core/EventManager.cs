using System;
using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;

namespace RichMan.Core
{
    /// <summary>
    /// 事件管理器 - 实现观察者模式，用于游戏内事件通信
    /// </summary>
    public class EventManager : Singleton<EventManager>
    {
        // 无参数事件字典
        private Dictionary<string, Action> _eventDictionary = new Dictionary<string, Action>();

        // 带参数事件字典（使用object作为通用参数）
        private Dictionary<string, Action<object>> _eventWithParamDictionary = new Dictionary<string, Action<object>>();

        #region 无参数事件

        /// <summary>
        /// 订阅事件
        /// </summary>
        public void Subscribe(string eventName, Action listener)
        {
            if (_eventDictionary.TryGetValue(eventName, out Action existingEvent))
            {
                existingEvent += listener;
                _eventDictionary[eventName] = existingEvent;
            }
            else
            {
                _eventDictionary[eventName] = listener;
            }
        }

        /// <summary>
        /// 取消订阅事件
        /// </summary>
        public void Unsubscribe(string eventName, Action listener)
        {
            if (_eventDictionary.TryGetValue(eventName, out Action existingEvent))
            {
                existingEvent -= listener;
                if (existingEvent == null)
                {
                    _eventDictionary.Remove(eventName);
                }
                else
                {
                    _eventDictionary[eventName] = existingEvent;
                }
            }
        }

        /// <summary>
        /// 触发事件
        /// </summary>
        public void TriggerEvent(string eventName)
        {
            if (_eventDictionary.TryGetValue(eventName, out Action existingEvent))
            {
                existingEvent?.Invoke();
            }
        }

        #endregion

        #region 带参数事件

        /// <summary>
        /// 订阅带参数的事件
        /// </summary>
        public void Subscribe(string eventName, Action<object> listener)
        {
            if (_eventWithParamDictionary.TryGetValue(eventName, out Action<object> existingEvent))
            {
                existingEvent += listener;
                _eventWithParamDictionary[eventName] = existingEvent;
            }
            else
            {
                _eventWithParamDictionary[eventName] = listener;
            }
        }

        /// <summary>
        /// 取消订阅带参数的事件
        /// </summary>
        public void Unsubscribe(string eventName, Action<object> listener)
        {
            if (_eventWithParamDictionary.TryGetValue(eventName, out Action<object> existingEvent))
            {
                existingEvent -= listener;
                if (existingEvent == null)
                {
                    _eventWithParamDictionary.Remove(eventName);
                }
                else
                {
                    _eventWithParamDictionary[eventName] = existingEvent;
                }
            }
        }

        /// <summary>
        /// 触发带参数的事件
        /// </summary>
        public void TriggerEvent(string eventName, object param)
        {
            if (_eventWithParamDictionary.TryGetValue(eventName, out Action<object> existingEvent))
            {
                existingEvent?.Invoke(param);
            }
        }

        #endregion

        /// <summary>
        /// 清除所有事件
        /// </summary>
        public void ClearAllEvents()
        {
            _eventDictionary.Clear();
            _eventWithParamDictionary.Clear();
        }

        /// <summary>
        /// 清除指定事件
        /// </summary>
        public void ClearEvent(string eventName)
        {
            _eventDictionary.Remove(eventName);
            _eventWithParamDictionary.Remove(eventName);
        }
    }

    /// <summary>
    /// 游戏事件名称常量
    /// </summary>
    public static class GameEvents
    {
        // 游戏流程事件
        public const string GameStarted = "GameStarted";
        public const string GamePaused = "GamePaused";
        public const string GameResumed = "GameResumed";
        public const string GameEnded = "GameEnded";

        // 回合事件
        public const string TurnStarted = "TurnStarted";
        public const string TurnEnded = "TurnEnded";
        public const string NewRound = "NewRound";

        // 骰子事件
        public const string DiceRolling = "DiceRolling";
        public const string DiceRolled = "DiceRolled";

        // 玩家事件
        public const string PlayerMoved = "PlayerMoved";
        public const string PlayerLandedOnTile = "PlayerLandedOnTile";
        public const string PlayerMoneyChanged = "PlayerMoneyChanged";
        public const string PlayerBankrupt = "PlayerBankrupt";
        public const string PlayerJailed = "PlayerJailed";
        public const string PlayerHospitalized = "PlayerHospitalized";

        // 地产事件
        public const string PropertyPurchased = "PropertyPurchased";
        public const string PropertyUpgraded = "PropertyUpgraded";
        public const string PropertyMortgaged = "PropertyMortgaged";
        public const string RentPaid = "RentPaid";

        // 卡片事件
        public const string CardDrawn = "CardDrawn";
        public const string CardUsed = "CardUsed";
        public const string CardEffectApplied = "CardEffectApplied";

        // UI事件
        public const string ShowDialog = "ShowDialog";
        public const string HideDialog = "HideDialog";
        public const string ShowPropertyInfo = "ShowPropertyInfo";
        public const string ShowPlayerInfo = "ShowPlayerInfo";
    }
}
