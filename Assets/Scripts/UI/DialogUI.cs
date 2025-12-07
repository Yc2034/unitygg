using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;

namespace RichMan.UI
{
    /// <summary>
    /// 对话框UI
    /// </summary>
    public class DialogUI : UIPanel
    {
        [Header("对话框元素")]
        [SerializeField] private GameObject _dialogPanel;
        [SerializeField] private TextMeshProUGUI _titleText;
        [SerializeField] private TextMeshProUGUI _messageText;

        [Header("按钮")]
        [SerializeField] private Button _confirmButton;
        [SerializeField] private Button _cancelButton;
        [SerializeField] private TextMeshProUGUI _confirmButtonText;
        [SerializeField] private TextMeshProUGUI _cancelButtonText;

        [Header("选择模式")]
        [SerializeField] private GameObject _choiceContainer;
        [SerializeField] private GameObject _choiceButtonPrefab;

        private Action _onConfirm;
        private Action _onCancel;
        private Action<int> _onChoice;

        protected override void Awake()
        {
            base.Awake();

            if (_confirmButton != null)
            {
                _confirmButton.onClick.AddListener(OnConfirmClicked);
            }

            if (_cancelButton != null)
            {
                _cancelButton.onClick.AddListener(OnCancelClicked);
            }
        }

        /// <summary>
        /// 显示确认对话框
        /// </summary>
        public void ShowConfirm(string title, string message, Action onConfirm, Action onCancel = null,
            string confirmText = "确定", string cancelText = "取消")
        {
            SetupDialog(title, message);

            _onConfirm = onConfirm;
            _onCancel = onCancel;

            // 显示两个按钮
            if (_confirmButton != null)
            {
                _confirmButton.gameObject.SetActive(true);
                if (_confirmButtonText != null)
                {
                    _confirmButtonText.text = confirmText;
                }
            }

            if (_cancelButton != null)
            {
                _cancelButton.gameObject.SetActive(onCancel != null);
                if (_cancelButtonText != null)
                {
                    _cancelButtonText.text = cancelText;
                }
            }

            // 隐藏选择容器
            if (_choiceContainer != null)
            {
                _choiceContainer.SetActive(false);
            }

            Show();
        }

        /// <summary>
        /// 显示消息对话框（只有一个确定按钮）
        /// </summary>
        public void ShowMessage(string title, string message, Action onClose = null)
        {
            ShowConfirm(title, message, onClose, null, "确定", "");
            if (_cancelButton != null)
            {
                _cancelButton.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// 显示选择对话框
        /// </summary>
        public void ShowChoice(string title, string message, string[] options, Action<int> onSelect)
        {
            SetupDialog(title, message);

            _onChoice = onSelect;

            // 隐藏标准按钮
            if (_confirmButton != null)
            {
                _confirmButton.gameObject.SetActive(false);
            }
            if (_cancelButton != null)
            {
                _cancelButton.gameObject.SetActive(false);
            }

            // 创建选择按钮
            if (_choiceContainer != null && _choiceButtonPrefab != null)
            {
                // 清除旧按钮
                foreach (Transform child in _choiceContainer.transform)
                {
                    Destroy(child.gameObject);
                }

                // 创建新按钮
                for (int i = 0; i < options.Length; i++)
                {
                    int index = i; // 闭包捕获
                    GameObject buttonObj = Instantiate(_choiceButtonPrefab, _choiceContainer.transform);
                    Button button = buttonObj.GetComponent<Button>();
                    TextMeshProUGUI buttonText = buttonObj.GetComponentInChildren<TextMeshProUGUI>();

                    if (buttonText != null)
                    {
                        buttonText.text = options[i];
                    }

                    if (button != null)
                    {
                        button.onClick.AddListener(() => OnChoiceSelected(index));
                    }
                }

                _choiceContainer.SetActive(true);
            }

            Show();
        }

        private void SetupDialog(string title, string message)
        {
            if (_titleText != null)
            {
                _titleText.text = title;
            }

            if (_messageText != null)
            {
                _messageText.text = message;
            }
        }

        private void OnConfirmClicked()
        {
            Hide();
            _onConfirm?.Invoke();
            ClearCallbacks();
        }

        private void OnCancelClicked()
        {
            Hide();
            _onCancel?.Invoke();
            ClearCallbacks();
        }

        private void OnChoiceSelected(int index)
        {
            Hide();
            _onChoice?.Invoke(index);
            ClearCallbacks();
        }

        private void ClearCallbacks()
        {
            _onConfirm = null;
            _onCancel = null;
            _onChoice = null;
        }

        /// <summary>
        /// 关闭对话框（不触发回调）
        /// </summary>
        public void CloseWithoutCallback()
        {
            ClearCallbacks();
            Hide();
        }
    }
}
