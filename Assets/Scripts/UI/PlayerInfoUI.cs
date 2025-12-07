using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using RichMan.Core;
using RichMan.Player;
using RichMan.Utils;

namespace RichMan.UI
{
    /// <summary>
    /// 玩家信息面板UI
    /// </summary>
    public class PlayerInfoUI : UIPanel
    {
        [Header("玩家信息项预制体")]
        [SerializeField] private GameObject _playerInfoItemPrefab;
        [SerializeField] private Transform _playerInfoContainer;

        [Header("详细信息面板")]
        [SerializeField] private GameObject _detailPanel;
        [SerializeField] private TextMeshProUGUI _detailPlayerName;
        [SerializeField] private TextMeshProUGUI _detailMoney;
        [SerializeField] private TextMeshProUGUI _detailProperties;
        [SerializeField] private TextMeshProUGUI _detailCards;
        [SerializeField] private Image _detailAvatar;

        private List<PlayerInfoItem> _playerInfoItems = new List<PlayerInfoItem>();
        private PlayerController _selectedPlayer;

        private void Start()
        {
            // 订阅玩家金钱变化事件
            EventManager.Instance.Subscribe(GameEvents.PlayerMoneyChanged, OnPlayerMoneyChanged);

            InitializePlayerInfoItems();
        }

        private void OnDestroy()
        {
            EventManager.Instance.Unsubscribe(GameEvents.PlayerMoneyChanged, OnPlayerMoneyChanged);
        }

        private void InitializePlayerInfoItems()
        {
            // 清除现有项
            foreach (var item in _playerInfoItems)
            {
                if (item != null)
                {
                    Destroy(item.gameObject);
                }
            }
            _playerInfoItems.Clear();

            // 为每个玩家创建信息项
            if (GameManager.Instance == null) return;

            foreach (var player in GameManager.Instance.Players)
            {
                CreatePlayerInfoItem(player);
            }
        }

        private void CreatePlayerInfoItem(PlayerController player)
        {
            if (_playerInfoItemPrefab == null || _playerInfoContainer == null) return;

            GameObject itemObj = Instantiate(_playerInfoItemPrefab, _playerInfoContainer);
            PlayerInfoItem item = itemObj.GetComponent<PlayerInfoItem>();

            if (item != null)
            {
                item.Initialize(player, OnPlayerItemClicked);
                _playerInfoItems.Add(item);
            }
        }

        public void UpdateDisplay()
        {
            foreach (var item in _playerInfoItems)
            {
                item?.UpdateDisplay();
            }

            // 更新详细面板
            if (_selectedPlayer != null)
            {
                ShowPlayerDetail(_selectedPlayer);
            }
        }

        private void OnPlayerMoneyChanged(object param)
        {
            UpdateDisplay();
        }

        private void OnPlayerItemClicked(PlayerController player)
        {
            _selectedPlayer = player;
            ShowPlayerDetail(player);
        }

        private void ShowPlayerDetail(PlayerController player)
        {
            if (_detailPanel == null || player == null) return;

            _detailPanel.SetActive(true);

            if (_detailPlayerName != null)
            {
                _detailPlayerName.text = player.PlayerName;
            }

            if (_detailMoney != null)
            {
                _detailMoney.text = $"${player.Money:N0}";
            }

            if (_detailProperties != null)
            {
                _detailProperties.text = $"地产: {player.OwnedProperties.Count}处";
            }

            if (_detailCards != null)
            {
                _detailCards.text = $"卡片: {player.Cards.Count}张";
            }
        }

        public void HideDetail()
        {
            if (_detailPanel != null)
            {
                _detailPanel.SetActive(false);
            }
            _selectedPlayer = null;
        }
    }

    /// <summary>
    /// 单个玩家信息项
    /// </summary>
    public class PlayerInfoItem : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI _nameText;
        [SerializeField] private TextMeshProUGUI _moneyText;
        [SerializeField] private Image _avatarImage;
        [SerializeField] private Image _backgroundImage;
        [SerializeField] private GameObject _currentTurnIndicator;
        [SerializeField] private Button _button;

        private PlayerController _player;
        private System.Action<PlayerController> _onClick;

        public void Initialize(PlayerController player, System.Action<PlayerController> onClick)
        {
            _player = player;
            _onClick = onClick;

            if (_button != null)
            {
                _button.onClick.AddListener(() => _onClick?.Invoke(_player));
            }

            UpdateDisplay();
        }

        public void UpdateDisplay()
        {
            if (_player == null) return;

            if (_nameText != null)
            {
                _nameText.text = _player.PlayerName;
            }

            if (_moneyText != null)
            {
                _moneyText.text = $"${_player.Money:N0}";
            }

            if (_backgroundImage != null)
            {
                _backgroundImage.color = _player.Data.PlayerColor;
            }

            // 显示当前回合指示器
            if (_currentTurnIndicator != null)
            {
                bool isCurrentPlayer = GameManager.Instance?.CurrentPlayer == _player;
                _currentTurnIndicator.SetActive(isCurrentPlayer);
            }

            // 显示破产状态
            if (_player.State == PlayerState.Bankrupt)
            {
                if (_nameText != null)
                {
                    _nameText.text += " (破产)";
                }
                if (_backgroundImage != null)
                {
                    _backgroundImage.color = Color.gray;
                }
            }
        }
    }
}
