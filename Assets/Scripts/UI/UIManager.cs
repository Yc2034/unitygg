using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Core;

namespace RichMan.UI
{
    /// <summary>
    /// UI管理器 - 管理所有UI面板
    /// </summary>
    public class UIManager : Singleton<UIManager>
    {
        [Header("UI面板引用")]
        [SerializeField] private MainMenuUI _mainMenuUI;
        [SerializeField] private GameUI _gameUI;
        [SerializeField] private PlayerInfoUI _playerInfoUI;
        [SerializeField] private DialogUI _dialogUI;
        [SerializeField] private SettingsUI _settingsUI;
        [SerializeField] private PauseMenuUI _pauseMenuUI;

        [Header("弹窗预制体")]
        [SerializeField] private GameObject _propertyPopupPrefab;
        [SerializeField] private GameObject _cardPopupPrefab;
        [SerializeField] private GameObject _messagePopupPrefab;

        // UI栈（用于管理弹窗层级）
        private Stack<UIPanel> _panelStack = new Stack<UIPanel>();

        protected override void OnSingletonAwake()
        {
            // 订阅游戏状态变化事件
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGameStateChanged += OnGameStateChanged;
            }
        }

        private void Start()
        {
            // 初始化时隐藏所有游戏内UI
            HideAllGameUI();
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGameStateChanged -= OnGameStateChanged;
            }
        }

        #region 状态响应

        private void OnGameStateChanged(GameState newState)
        {
            switch (newState)
            {
                case GameState.MainMenu:
                    ShowMainMenu();
                    break;
                case GameState.Playing:
                    ShowGameUI();
                    break;
                case GameState.Paused:
                    ShowPauseMenu();
                    break;
                case GameState.GameOver:
                    ShowGameOverUI();
                    break;
            }
        }

        #endregion

        #region 面板显示控制

        public void ShowMainMenu()
        {
            HideAllGameUI();
            if (_mainMenuUI != null)
            {
                _mainMenuUI.Show();
            }
        }

        public void ShowGameUI()
        {
            if (_mainMenuUI != null)
            {
                _mainMenuUI.Hide();
            }
            if (_gameUI != null)
            {
                _gameUI.Show();
            }
            if (_playerInfoUI != null)
            {
                _playerInfoUI.Show();
            }
        }

        public void ShowPauseMenu()
        {
            if (_pauseMenuUI != null)
            {
                _pauseMenuUI.Show();
            }
        }

        public void HidePauseMenu()
        {
            if (_pauseMenuUI != null)
            {
                _pauseMenuUI.Hide();
            }
        }

        public void ShowSettings()
        {
            if (_settingsUI != null)
            {
                _settingsUI.Show();
            }
        }

        public void ShowGameOverUI()
        {
            // TODO: 显示游戏结束UI
        }

        private void HideAllGameUI()
        {
            if (_gameUI != null) _gameUI.Hide();
            if (_playerInfoUI != null) _playerInfoUI.Hide();
            if (_pauseMenuUI != null) _pauseMenuUI.Hide();
            if (_settingsUI != null) _settingsUI.Hide();
        }

        #endregion

        #region 对话框

        /// <summary>
        /// 显示确认对话框
        /// </summary>
        public void ShowConfirmDialog(string title, string message, System.Action onConfirm, System.Action onCancel = null)
        {
            if (_dialogUI != null)
            {
                _dialogUI.ShowConfirm(title, message, onConfirm, onCancel);
            }
        }

        /// <summary>
        /// 显示消息对话框
        /// </summary>
        public void ShowMessage(string title, string message, System.Action onClose = null)
        {
            if (_dialogUI != null)
            {
                _dialogUI.ShowMessage(title, message, onClose);
            }
        }

        /// <summary>
        /// 显示选择对话框
        /// </summary>
        public void ShowChoice(string title, string message, string[] options, System.Action<int> onSelect)
        {
            if (_dialogUI != null)
            {
                _dialogUI.ShowChoice(title, message, options, onSelect);
            }
        }

        #endregion

        #region UI栈管理

        /// <summary>
        /// 压入UI面板
        /// </summary>
        public void PushPanel(UIPanel panel)
        {
            if (_panelStack.Count > 0)
            {
                _panelStack.Peek().OnPause();
            }
            _panelStack.Push(panel);
            panel.Show();
        }

        /// <summary>
        /// 弹出UI面板
        /// </summary>
        public void PopPanel()
        {
            if (_panelStack.Count > 0)
            {
                UIPanel panel = _panelStack.Pop();
                panel.Hide();

                if (_panelStack.Count > 0)
                {
                    _panelStack.Peek().OnResume();
                }
            }
        }

        /// <summary>
        /// 关闭所有弹窗
        /// </summary>
        public void CloseAllPopups()
        {
            while (_panelStack.Count > 0)
            {
                PopPanel();
            }
        }

        #endregion

        #region 快捷方法

        /// <summary>
        /// 更新玩家信息显示
        /// </summary>
        public void UpdatePlayerInfo()
        {
            if (_playerInfoUI != null)
            {
                _playerInfoUI.UpdateDisplay();
            }
        }

        /// <summary>
        /// 更新游戏UI
        /// </summary>
        public void UpdateGameUI()
        {
            if (_gameUI != null)
            {
                _gameUI.UpdateDisplay();
            }
        }

        #endregion
    }

    /// <summary>
    /// UI面板基类
    /// </summary>
    public abstract class UIPanel : MonoBehaviour
    {
        [SerializeField] protected CanvasGroup _canvasGroup;
        [SerializeField] protected bool _useAnimation = true;
        [SerializeField] protected float _animationDuration = 0.3f;

        public bool IsVisible { get; protected set; }

        protected virtual void Awake()
        {
            if (_canvasGroup == null)
            {
                _canvasGroup = GetComponent<CanvasGroup>();
            }
        }

        public virtual void Show()
        {
            gameObject.SetActive(true);
            IsVisible = true;

            if (_canvasGroup != null)
            {
                _canvasGroup.alpha = 1;
                _canvasGroup.interactable = true;
                _canvasGroup.blocksRaycasts = true;
            }

            OnShow();
        }

        public virtual void Hide()
        {
            IsVisible = false;

            if (_canvasGroup != null)
            {
                _canvasGroup.interactable = false;
                _canvasGroup.blocksRaycasts = false;
            }

            gameObject.SetActive(false);
            OnHide();
        }

        public virtual void OnPause() { }
        public virtual void OnResume() { }

        protected virtual void OnShow() { }
        protected virtual void OnHide() { }
    }
}
