using UnityEngine;
using UnityEngine.UI;
using TMPro;
using RichMan.Core;
using RichMan.Player;
using RichMan.Dice;

namespace RichMan.UI
{
    /// <summary>
    /// 游戏主界面UI
    /// </summary>
    public class GameUI : UIPanel
    {
        [Header("回合信息")]
        [SerializeField] private TextMeshProUGUI _turnNumberText;
        [SerializeField] private TextMeshProUGUI _currentPlayerText;
        [SerializeField] private Image _currentPlayerAvatar;

        [Header("骰子")]
        [SerializeField] private Button _rollDiceButton;
        [SerializeField] private TextMeshProUGUI _diceResultText;
        [SerializeField] private GameObject _diceAnimationObject;

        [Header("操作按钮")]
        [SerializeField] private Button _useCardButton;
        [SerializeField] private Button _viewMapButton;
        [SerializeField] private Button _endTurnButton;
        [SerializeField] private Button _pauseButton;

        [Header("快捷信息")]
        [SerializeField] private TextMeshProUGUI _messageText;

        private TurnManager _turnManager;
        private DiceManager _diceManager;

        protected override void Awake()
        {
            base.Awake();
            SetupButtons();
        }

        private void Start()
        {
            _turnManager = FindObjectOfType<TurnManager>();
            _diceManager = DiceManager.Instance;

            SubscribeToEvents();
        }

        private void OnDestroy()
        {
            UnsubscribeFromEvents();
        }

        private void SetupButtons()
        {
            if (_rollDiceButton != null)
            {
                _rollDiceButton.onClick.AddListener(OnRollDiceClicked);
            }

            if (_useCardButton != null)
            {
                _useCardButton.onClick.AddListener(OnUseCardClicked);
            }

            if (_endTurnButton != null)
            {
                _endTurnButton.onClick.AddListener(OnEndTurnClicked);
            }

            if (_pauseButton != null)
            {
                _pauseButton.onClick.AddListener(OnPauseClicked);
            }
        }

        private void SubscribeToEvents()
        {
            if (_turnManager != null)
            {
                _turnManager.OnTurnStart += OnTurnStart;
                _turnManager.OnTurnEnd += OnTurnEnd;
                _turnManager.OnTurnStateChanged += OnTurnStateChanged;
            }

            if (_diceManager != null)
            {
                _diceManager.OnRollStart += OnDiceRollStart;
                _diceManager.OnTotalCalculated += OnDiceResult;
            }
        }

        private void UnsubscribeFromEvents()
        {
            if (_turnManager != null)
            {
                _turnManager.OnTurnStart -= OnTurnStart;
                _turnManager.OnTurnEnd -= OnTurnEnd;
                _turnManager.OnTurnStateChanged -= OnTurnStateChanged;
            }

            if (_diceManager != null)
            {
                _diceManager.OnRollStart -= OnDiceRollStart;
                _diceManager.OnTotalCalculated -= OnDiceResult;
            }
        }

        #region UI更新

        public void UpdateDisplay()
        {
            UpdateTurnInfo();
            UpdateButtons();
        }

        private void UpdateTurnInfo()
        {
            if (_turnManager == null) return;

            if (_turnNumberText != null)
            {
                _turnNumberText.text = $"第 {_turnManager.TurnNumber} 回合";
            }

            PlayerController currentPlayer = _turnManager.CurrentPlayer;
            if (currentPlayer != null)
            {
                if (_currentPlayerText != null)
                {
                    _currentPlayerText.text = currentPlayer.PlayerName;
                }

                // TODO: 更新头像
            }
        }

        private void UpdateButtons()
        {
            if (_turnManager == null) return;

            bool canRoll = _turnManager.CanRollDice();
            bool canUseCard = _turnManager.CanUseCard();
            bool isPlayerTurn = _turnManager.CurrentPlayer?.IsAI == false;

            if (_rollDiceButton != null)
            {
                _rollDiceButton.interactable = canRoll && isPlayerTurn;
            }

            if (_useCardButton != null)
            {
                _useCardButton.interactable = canUseCard && isPlayerTurn;
            }

            if (_endTurnButton != null)
            {
                _endTurnButton.interactable = isPlayerTurn &&
                    _turnManager.CurrentTurnState == Utils.TurnState.OnTile;
            }
        }

        public void ShowMessage(string message)
        {
            if (_messageText != null)
            {
                _messageText.text = message;
            }
        }

        #endregion

        #region 事件处理

        private void OnTurnStart(PlayerController player)
        {
            UpdateDisplay();
            ShowMessage($"{player.PlayerName} 的回合");

            // 隐藏上次的骰子结果
            if (_diceResultText != null)
            {
                _diceResultText.text = "";
            }
        }

        private void OnTurnEnd(PlayerController player)
        {
            UpdateButtons();
        }

        private void OnTurnStateChanged(Utils.TurnState state)
        {
            UpdateButtons();
        }

        private void OnDiceRollStart()
        {
            if (_rollDiceButton != null)
            {
                _rollDiceButton.interactable = false;
            }

            if (_diceAnimationObject != null)
            {
                _diceAnimationObject.SetActive(true);
            }
        }

        private void OnDiceResult(int total)
        {
            if (_diceResultText != null)
            {
                _diceResultText.text = total.ToString();
            }

            if (_diceAnimationObject != null)
            {
                _diceAnimationObject.SetActive(false);
            }

            ShowMessage($"掷出了 {total} 点！");
        }

        #endregion

        #region 按钮回调

        private void OnRollDiceClicked()
        {
            if (_diceManager != null && _turnManager != null && _turnManager.CanRollDice())
            {
                _diceManager.Roll();
            }
        }

        private void OnUseCardClicked()
        {
            // TODO: 打开卡片选择界面
            Debug.Log("打开卡片选择界面");
        }

        private void OnEndTurnClicked()
        {
            if (_turnManager != null)
            {
                _turnManager.EndTurn();
            }
        }

        private void OnPauseClicked()
        {
            GameManager.Instance?.PauseGame();
        }

        #endregion
    }
}
