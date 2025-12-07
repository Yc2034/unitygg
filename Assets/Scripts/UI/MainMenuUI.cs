using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using RichMan.Core;
using RichMan.Utils;

namespace RichMan.UI
{
    /// <summary>
    /// 主菜单UI
    /// </summary>
    public class MainMenuUI : UIPanel
    {
        [Header("主菜单按钮")]
        [SerializeField] private Button _newGameButton;
        [SerializeField] private Button _loadGameButton;
        [SerializeField] private Button _settingsButton;
        [SerializeField] private Button _exitButton;

        [Header("游戏设置面板")]
        [SerializeField] private GameObject _gameSetupPanel;
        [SerializeField] private Slider _playerCountSlider;
        [SerializeField] private TextMeshProUGUI _playerCountText;
        [SerializeField] private Slider _aiCountSlider;
        [SerializeField] private TextMeshProUGUI _aiCountText;
        [SerializeField] private TMP_Dropdown _mapDropdown;
        [SerializeField] private Button _startButton;
        [SerializeField] private Button _backButton;

        [Header("角色选择")]
        [SerializeField] private GameObject _characterSelectPanel;
        [SerializeField] private Transform _characterContainer;
        [SerializeField] private GameObject _characterButtonPrefab;

        private int _selectedPlayerCount = 1;
        private int _selectedAICount = 1;

        protected override void Awake()
        {
            base.Awake();
            SetupButtons();
            SetupSliders();
        }

        private void SetupButtons()
        {
            if (_newGameButton != null)
            {
                _newGameButton.onClick.AddListener(OnNewGameClicked);
            }

            if (_loadGameButton != null)
            {
                _loadGameButton.onClick.AddListener(OnLoadGameClicked);
            }

            if (_settingsButton != null)
            {
                _settingsButton.onClick.AddListener(OnSettingsClicked);
            }

            if (_exitButton != null)
            {
                _exitButton.onClick.AddListener(OnExitClicked);
            }

            if (_startButton != null)
            {
                _startButton.onClick.AddListener(OnStartGameClicked);
            }

            if (_backButton != null)
            {
                _backButton.onClick.AddListener(OnBackClicked);
            }
        }

        private void SetupSliders()
        {
            if (_playerCountSlider != null)
            {
                _playerCountSlider.minValue = 1;
                _playerCountSlider.maxValue = Constants.MaxPlayers;
                _playerCountSlider.value = 1;
                _playerCountSlider.onValueChanged.AddListener(OnPlayerCountChanged);
            }

            if (_aiCountSlider != null)
            {
                _aiCountSlider.minValue = 0;
                _aiCountSlider.maxValue = Constants.MaxPlayers - 1;
                _aiCountSlider.value = 1;
                _aiCountSlider.onValueChanged.AddListener(OnAICountChanged);
            }

            UpdateCountDisplays();
        }

        protected override void OnShow()
        {
            base.OnShow();

            // 确保游戏设置面板初始隐藏
            if (_gameSetupPanel != null)
            {
                _gameSetupPanel.SetActive(false);
            }

            // 检查是否有存档
            if (_loadGameButton != null)
            {
                _loadGameButton.interactable = HasSaveData();
            }
        }

        private bool HasSaveData()
        {
            // TODO: 检查是否有存档
            return PlayerPrefs.HasKey(Constants.PrefKeySaveData);
        }

        #region 按钮回调

        private void OnNewGameClicked()
        {
            if (_gameSetupPanel != null)
            {
                _gameSetupPanel.SetActive(true);
            }
        }

        private void OnLoadGameClicked()
        {
            // TODO: 加载存档
            GameManager.Instance?.LoadGame();
        }

        private void OnSettingsClicked()
        {
            UIManager.Instance?.ShowSettings();
        }

        private void OnExitClicked()
        {
            UIManager.Instance?.ShowConfirmDialog(
                "退出游戏",
                "确定要退出游戏吗？",
                () =>
                {
#if UNITY_EDITOR
                    UnityEditor.EditorApplication.isPlaying = false;
#else
                    Application.Quit();
#endif
                }
            );
        }

        private void OnBackClicked()
        {
            if (_gameSetupPanel != null)
            {
                _gameSetupPanel.SetActive(false);
            }
        }

        private void OnStartGameClicked()
        {
            int totalPlayers = _selectedPlayerCount + _selectedAICount;

            if (totalPlayers < Constants.MinPlayers)
            {
                UIManager.Instance?.ShowMessage("提示", $"至少需要{Constants.MinPlayers}名玩家才能开始游戏");
                return;
            }

            if (totalPlayers > Constants.MaxPlayers)
            {
                UIManager.Instance?.ShowMessage("提示", $"最多只能有{Constants.MaxPlayers}名玩家");
                return;
            }

            // 初始化游戏
            GameManager.Instance?.InitializeGame(_selectedPlayerCount, _selectedAICount);

            // 加载游戏场景
            SceneManager.LoadScene(Constants.SceneGame);
        }

        #endregion

        #region 滑块回调

        private void OnPlayerCountChanged(float value)
        {
            _selectedPlayerCount = (int)value;
            UpdateCountDisplays();
            ValidateTotalPlayers();
        }

        private void OnAICountChanged(float value)
        {
            _selectedAICount = (int)value;
            UpdateCountDisplays();
            ValidateTotalPlayers();
        }

        private void UpdateCountDisplays()
        {
            if (_playerCountText != null)
            {
                _playerCountText.text = _selectedPlayerCount.ToString();
            }

            if (_aiCountText != null)
            {
                _aiCountText.text = _selectedAICount.ToString();
            }
        }

        private void ValidateTotalPlayers()
        {
            int total = _selectedPlayerCount + _selectedAICount;

            // 自动调整以确保在有效范围内
            if (total > Constants.MaxPlayers)
            {
                if (_aiCountSlider != null)
                {
                    _aiCountSlider.value = Constants.MaxPlayers - _selectedPlayerCount;
                    _selectedAICount = (int)_aiCountSlider.value;
                    UpdateCountDisplays();
                }
            }

            // 启用/禁用开始按钮
            if (_startButton != null)
            {
                _startButton.interactable = total >= Constants.MinPlayers && total <= Constants.MaxPlayers;
            }
        }

        #endregion
    }

    /// <summary>
    /// 暂停菜单UI
    /// </summary>
    public class PauseMenuUI : UIPanel
    {
        [SerializeField] private Button _resumeButton;
        [SerializeField] private Button _settingsButton;
        [SerializeField] private Button _saveButton;
        [SerializeField] private Button _mainMenuButton;

        protected override void Awake()
        {
            base.Awake();

            if (_resumeButton != null)
            {
                _resumeButton.onClick.AddListener(OnResumeClicked);
            }

            if (_settingsButton != null)
            {
                _settingsButton.onClick.AddListener(OnSettingsClicked);
            }

            if (_saveButton != null)
            {
                _saveButton.onClick.AddListener(OnSaveClicked);
            }

            if (_mainMenuButton != null)
            {
                _mainMenuButton.onClick.AddListener(OnMainMenuClicked);
            }
        }

        private void OnResumeClicked()
        {
            GameManager.Instance?.ResumeGame();
            Hide();
        }

        private void OnSettingsClicked()
        {
            UIManager.Instance?.ShowSettings();
        }

        private void OnSaveClicked()
        {
            GameManager.Instance?.SaveGame();
            UIManager.Instance?.ShowMessage("保存成功", "游戏已保存");
        }

        private void OnMainMenuClicked()
        {
            UIManager.Instance?.ShowConfirmDialog(
                "返回主菜单",
                "确定要返回主菜单吗？未保存的进度将丢失。",
                () =>
                {
                    GameManager.Instance?.ReturnToMainMenu();
                }
            );
        }
    }

    /// <summary>
    /// 设置UI
    /// </summary>
    public class SettingsUI : UIPanel
    {
        [Header("音频设置")]
        [SerializeField] private Slider _bgmVolumeSlider;
        [SerializeField] private Slider _sfxVolumeSlider;
        [SerializeField] private TextMeshProUGUI _bgmVolumeText;
        [SerializeField] private TextMeshProUGUI _sfxVolumeText;

        [Header("按钮")]
        [SerializeField] private Button _closeButton;
        [SerializeField] private Button _resetButton;

        protected override void Awake()
        {
            base.Awake();

            if (_bgmVolumeSlider != null)
            {
                _bgmVolumeSlider.onValueChanged.AddListener(OnBGMVolumeChanged);
            }

            if (_sfxVolumeSlider != null)
            {
                _sfxVolumeSlider.onValueChanged.AddListener(OnSFXVolumeChanged);
            }

            if (_closeButton != null)
            {
                _closeButton.onClick.AddListener(OnCloseClicked);
            }

            if (_resetButton != null)
            {
                _resetButton.onClick.AddListener(OnResetClicked);
            }

            LoadSettings();
        }

        private void LoadSettings()
        {
            float bgmVolume = PlayerPrefs.GetFloat(Constants.PrefKeyBGMVolume, 0.8f);
            float sfxVolume = PlayerPrefs.GetFloat(Constants.PrefKeySFXVolume, 1f);

            if (_bgmVolumeSlider != null)
            {
                _bgmVolumeSlider.value = bgmVolume;
            }

            if (_sfxVolumeSlider != null)
            {
                _sfxVolumeSlider.value = sfxVolume;
            }
        }

        private void SaveSettings()
        {
            PlayerPrefs.SetFloat(Constants.PrefKeyBGMVolume, _bgmVolumeSlider?.value ?? 0.8f);
            PlayerPrefs.SetFloat(Constants.PrefKeySFXVolume, _sfxVolumeSlider?.value ?? 1f);
            PlayerPrefs.Save();
        }

        private void OnBGMVolumeChanged(float value)
        {
            if (_bgmVolumeText != null)
            {
                _bgmVolumeText.text = $"{(int)(value * 100)}%";
            }
            // TODO: 更新实际音量
            SaveSettings();
        }

        private void OnSFXVolumeChanged(float value)
        {
            if (_sfxVolumeText != null)
            {
                _sfxVolumeText.text = $"{(int)(value * 100)}%";
            }
            // TODO: 更新实际音量
            SaveSettings();
        }

        private void OnCloseClicked()
        {
            Hide();
        }

        private void OnResetClicked()
        {
            if (_bgmVolumeSlider != null) _bgmVolumeSlider.value = 0.8f;
            if (_sfxVolumeSlider != null) _sfxVolumeSlider.value = 1f;
            SaveSettings();
        }
    }
}
