using System;
using System.Collections;
using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Core;

namespace RichMan.Dice
{
    /// <summary>
    /// 骰子管理器 - 管理骰子的投掷和结果
    /// </summary>
    public class DiceManager : Singleton<DiceManager>
    {
        [Header("骰子设置")]
        [SerializeField] private int _diceCount = 1; // 骰子数量
        [SerializeField] private int _minValue = 1;
        [SerializeField] private int _maxValue = 6;

        [Header("动画设置")]
        [SerializeField] private float _rollDuration = 1.5f; // 投掷动画时长
        [SerializeField] private float _rollInterval = 0.1f; // 数字变化间隔
        [SerializeField] private Dice[] _diceObjects; // 骰子对象引用

        [Header("音效")]
        [SerializeField] private AudioClip _rollSound;
        [SerializeField] private AudioClip _resultSound;

        // 状态
        public bool IsRolling { get; private set; } = false;
        public int[] LastResults { get; private set; }
        public int LastTotal { get; private set; }

        // 控制骰子（作弊/技能）
        private int? _forcedResult = null;
        private bool _isControlled = false;

        // 事件
        public event Action OnRollStart;
        public event Action<int[]> OnRollEnd; // 参数：每个骰子的结果
        public event Action<int> OnTotalCalculated; // 参数：总点数

        private TurnManager _turnManager;

        protected override void OnSingletonAwake()
        {
            LastResults = new int[_diceCount];
        }

        private void Start()
        {
            _turnManager = FindObjectOfType<TurnManager>();
        }

        #region 投掷骰子

        /// <summary>
        /// 投掷骰子
        /// </summary>
        public void Roll()
        {
            if (IsRolling)
            {
                Debug.LogWarning("骰子正在投掷中！");
                return;
            }

            if (_turnManager != null && !_turnManager.CanRollDice())
            {
                Debug.LogWarning("当前状态不允许投掷骰子！");
                return;
            }

            StartCoroutine(RollCoroutine());
        }

        /// <summary>
        /// 投掷骰子协程
        /// </summary>
        private IEnumerator RollCoroutine()
        {
            IsRolling = true;
            _turnManager?.SetRolling();
            OnRollStart?.Invoke();
            EventManager.Instance.TriggerEvent(GameEvents.DiceRolling);

            // 播放投掷音效
            if (_rollSound != null)
            {
                AudioSource.PlayClipAtPoint(_rollSound, Camera.main.transform.position);
            }

            // 计算最终结果
            int[] finalResults = CalculateResults();

            // 动画阶段：数字快速变化
            float elapsed = 0f;
            while (elapsed < _rollDuration)
            {
                // 显示随机数字（视觉效果）
                for (int i = 0; i < _diceCount; i++)
                {
                    int randomValue = UnityEngine.Random.Range(_minValue, _maxValue + 1);
                    UpdateDiceVisual(i, randomValue);
                }

                elapsed += _rollInterval;
                yield return new WaitForSeconds(_rollInterval);
            }

            // 显示最终结果
            LastResults = finalResults;
            LastTotal = 0;

            for (int i = 0; i < _diceCount; i++)
            {
                UpdateDiceVisual(i, finalResults[i]);
                LastTotal += finalResults[i];
            }

            // 播放结果音效
            if (_resultSound != null)
            {
                AudioSource.PlayClipAtPoint(_resultSound, Camera.main.transform.position);
            }

            yield return new WaitForSeconds(0.5f);

            IsRolling = false;
            _isControlled = false;
            _forcedResult = null;

            // 触发事件
            OnRollEnd?.Invoke(LastResults);
            OnTotalCalculated?.Invoke(LastTotal);
            EventManager.Instance.TriggerEvent(GameEvents.DiceRolled, LastTotal);

            Debug.Log($"骰子结果: {string.Join(", ", finalResults)} = {LastTotal}");

            // 通知当前玩家移动
            PlayerController currentPlayer = GameManager.Instance?.CurrentPlayer;
            if (currentPlayer != null)
            {
                currentPlayer.Move(LastTotal);
            }
        }

        /// <summary>
        /// 计算骰子结果
        /// </summary>
        private int[] CalculateResults()
        {
            int[] results = new int[_diceCount];

            if (_isControlled && _forcedResult.HasValue)
            {
                // 使用控制的结果
                if (_diceCount == 1)
                {
                    results[0] = Mathf.Clamp(_forcedResult.Value, _minValue, _maxValue);
                }
                else
                {
                    // 多个骰子时，尝试分配点数
                    int remaining = _forcedResult.Value;
                    for (int i = 0; i < _diceCount; i++)
                    {
                        int maxPossible = Mathf.Min(_maxValue, remaining - (_diceCount - i - 1) * _minValue);
                        int minPossible = Mathf.Max(_minValue, remaining - (_diceCount - i - 1) * _maxValue);
                        results[i] = Mathf.Clamp(UnityEngine.Random.Range(minPossible, maxPossible + 1), _minValue, _maxValue);
                        remaining -= results[i];
                    }
                }
            }
            else
            {
                // 正常随机
                for (int i = 0; i < _diceCount; i++)
                {
                    results[i] = UnityEngine.Random.Range(_minValue, _maxValue + 1);
                }
            }

            return results;
        }

        /// <summary>
        /// 更新骰子视觉显示
        /// </summary>
        private void UpdateDiceVisual(int diceIndex, int value)
        {
            if (_diceObjects != null && diceIndex < _diceObjects.Length && _diceObjects[diceIndex] != null)
            {
                _diceObjects[diceIndex].ShowValue(value);
            }
        }

        #endregion

        #region 骰子控制

        /// <summary>
        /// 设置下一次投掷的结果（遥控骰子卡片）
        /// </summary>
        public void SetForcedResult(int value)
        {
            _forcedResult = Mathf.Clamp(value, _minValue * _diceCount, _maxValue * _diceCount);
            _isControlled = true;
            Debug.Log($"骰子被控制，下次结果将为: {_forcedResult}");
        }

        /// <summary>
        /// 取消骰子控制
        /// </summary>
        public void ClearControl()
        {
            _forcedResult = null;
            _isControlled = false;
        }

        /// <summary>
        /// 检查骰子是否被控制
        /// </summary>
        public bool IsControlled => _isControlled;

        #endregion

        #region 辅助方法

        /// <summary>
        /// 获取可能的最小点数
        /// </summary>
        public int MinPossible => _minValue * _diceCount;

        /// <summary>
        /// 获取可能的最大点数
        /// </summary>
        public int MaxPossible => _maxValue * _diceCount;

        /// <summary>
        /// 模拟投掷（不触发动画，用于AI预测）
        /// </summary>
        public int SimulateRoll()
        {
            int total = 0;
            for (int i = 0; i < _diceCount; i++)
            {
                total += UnityEngine.Random.Range(_minValue, _maxValue + 1);
            }
            return total;
        }

        #endregion
    }

    /// <summary>
    /// 单个骰子对象
    /// </summary>
    public class Dice : MonoBehaviour
    {
        [SerializeField] private SpriteRenderer _spriteRenderer;
        [SerializeField] private Sprite[] _faceSprites; // 1-6点的精灵
        [SerializeField] private Animator _animator;

        private int _currentValue = 1;
        public int CurrentValue => _currentValue;

        /// <summary>
        /// 显示指定点数
        /// </summary>
        public void ShowValue(int value)
        {
            _currentValue = Mathf.Clamp(value, 1, 6);

            if (_spriteRenderer != null && _faceSprites != null && _faceSprites.Length >= 6)
            {
                _spriteRenderer.sprite = _faceSprites[_currentValue - 1];
            }
        }

        /// <summary>
        /// 播放投掷动画
        /// </summary>
        public void PlayRollAnimation()
        {
            if (_animator != null)
            {
                _animator.SetTrigger("Roll");
            }
        }
    }
}
