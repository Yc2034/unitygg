#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;

namespace RichMan.Editor
{
    /// <summary>
    /// 场景设置编辑器 - 帮助在场景中快速创建游戏对象
    /// </summary>
    public class SceneSetupEditor : EditorWindow
    {
        [MenuItem("RichMan/Scene Setup Window")]
        public static void ShowWindow()
        {
            GetWindow<SceneSetupEditor>("场景设置工具");
        }

        private void OnGUI()
        {
            GUILayout.Label("场景快速设置工具", EditorStyles.boldLabel);
            GUILayout.Space(10);

            // Game场景设置
            GUILayout.Label("Game 场景设置", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox("在Game场景中使用以下按钮快速创建游戏对象", MessageType.Info);

            if (GUILayout.Button("创建所有管理器"))
            {
                CreateAllManagers();
            }

            if (GUILayout.Button("创建游戏UI Canvas"))
            {
                CreateGameUICanvas();
            }

            if (GUILayout.Button("创建主摄像机（2D）"))
            {
                Setup2DCamera();
            }

            GUILayout.Space(10);

            // MainMenu场景设置
            GUILayout.Label("MainMenu 场景设置", EditorStyles.boldLabel);

            if (GUILayout.Button("创建主菜单UI Canvas"))
            {
                CreateMainMenuUICanvas();
            }

            GUILayout.Space(10);

            // 一键设置当前场景
            GUI.backgroundColor = Color.cyan;
            if (GUILayout.Button("一键设置Game场景", GUILayout.Height(30)))
            {
                SetupGameScene();
            }
            GUI.backgroundColor = Color.yellow;
            if (GUILayout.Button("一键设置MainMenu场景", GUILayout.Height(30)))
            {
                SetupMainMenuScene();
            }
            GUI.backgroundColor = Color.white;
        }

        #region 管理器创建

        private static void CreateAllManagers()
        {
            // 创建Managers父对象
            GameObject managers = new GameObject("--- Managers ---");

            // GameManager
            GameObject gameManager = new GameObject("GameManager");
            gameManager.transform.SetParent(managers.transform);
            gameManager.AddComponent<Core.GameManager>();

            // TurnManager
            GameObject turnManager = new GameObject("TurnManager");
            turnManager.transform.SetParent(managers.transform);
            turnManager.AddComponent<Core.TurnManager>();

            // BoardManager
            GameObject boardManager = new GameObject("BoardManager");
            boardManager.transform.SetParent(managers.transform);
            boardManager.AddComponent<Board.BoardManager>();

            // DiceManager
            GameObject diceManager = new GameObject("DiceManager");
            diceManager.transform.SetParent(managers.transform);
            diceManager.AddComponent<Dice.DiceManager>();

            // CardManager
            GameObject cardManager = new GameObject("CardManager");
            cardManager.transform.SetParent(managers.transform);
            cardManager.AddComponent<Cards.CardManager>();

            // AudioManager
            GameObject audioManager = new GameObject("AudioManager");
            audioManager.transform.SetParent(managers.transform);
            audioManager.AddComponent<Audio.AudioManager>();

            // EventManager (会自动创建，这里显式创建便于查看)
            GameObject eventManager = new GameObject("EventManager");
            eventManager.transform.SetParent(managers.transform);
            eventManager.AddComponent<Core.EventManager>();

            // Bank
            GameObject bank = new GameObject("Bank");
            bank.transform.SetParent(managers.transform);
            bank.AddComponent<Economy.Bank>();

            Debug.Log("所有管理器创建完成！");
        }

        #endregion

        #region UI创建

        private static void CreateGameUICanvas()
        {
            // 检查是否已有EventSystem
            if (FindObjectOfType<EventSystem>() == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<EventSystem>();
                eventSystem.AddComponent<StandaloneInputModule>();
            }

            // 创建Canvas
            GameObject canvasObj = new GameObject("GameCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;

            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;

            canvasObj.AddComponent<GraphicRaycaster>();

            // 创建UIManager
            GameObject uiManager = new GameObject("UIManager");
            uiManager.transform.SetParent(canvasObj.transform);
            uiManager.AddComponent<UI.UIManager>();

            // 创建GameUI面板
            GameObject gameUI = CreatePanel("GameUI", canvasObj.transform);
            gameUI.AddComponent<UI.GameUI>();
            AddCanvasGroup(gameUI);

            // 回合信息
            GameObject turnInfo = CreatePanel("TurnInfo", gameUI.transform);
            RectTransform turnRect = turnInfo.GetComponent<RectTransform>();
            turnRect.anchorMin = new Vector2(0, 1);
            turnRect.anchorMax = new Vector2(0, 1);
            turnRect.pivot = new Vector2(0, 1);
            turnRect.anchoredPosition = new Vector2(20, -20);
            turnRect.sizeDelta = new Vector2(300, 100);

            CreateText("TurnNumberText", turnInfo.transform, "第 1 回合", 24);
            CreateText("CurrentPlayerText", turnInfo.transform, "玩家名称", 20);

            // 骰子按钮区域
            GameObject diceArea = CreatePanel("DiceArea", gameUI.transform);
            RectTransform diceRect = diceArea.GetComponent<RectTransform>();
            diceRect.anchorMin = new Vector2(0.5f, 0);
            diceRect.anchorMax = new Vector2(0.5f, 0);
            diceRect.pivot = new Vector2(0.5f, 0);
            diceRect.anchoredPosition = new Vector2(0, 20);
            diceRect.sizeDelta = new Vector2(400, 150);

            CreateButton("RollDiceButton", diceArea.transform, "掷骰子", new Vector2(0, 60));
            CreateText("DiceResultText", diceArea.transform, "", 48);

            // 操作按钮
            GameObject actionButtons = CreatePanel("ActionButtons", gameUI.transform);
            RectTransform actionRect = actionButtons.GetComponent<RectTransform>();
            actionRect.anchorMin = new Vector2(1, 0);
            actionRect.anchorMax = new Vector2(1, 0);
            actionRect.pivot = new Vector2(1, 0);
            actionRect.anchoredPosition = new Vector2(-20, 20);
            actionRect.sizeDelta = new Vector2(200, 200);

            CreateButton("UseCardButton", actionButtons.transform, "使用卡片", new Vector2(0, 60));
            CreateButton("EndTurnButton", actionButtons.transform, "结束回合", new Vector2(0, 0));

            // 暂停按钮
            CreateButton("PauseButton", gameUI.transform, "II", new Vector2(-60, -30),
                new Vector2(1, 1), new Vector2(1, 1), new Vector2(50, 50));

            // 创建PlayerInfoUI面板
            GameObject playerInfoUI = CreatePanel("PlayerInfoUI", canvasObj.transform);
            playerInfoUI.AddComponent<UI.PlayerInfoUI>();
            AddCanvasGroup(playerInfoUI);
            RectTransform playerInfoRect = playerInfoUI.GetComponent<RectTransform>();
            playerInfoRect.anchorMin = new Vector2(1, 1);
            playerInfoRect.anchorMax = new Vector2(1, 1);
            playerInfoRect.pivot = new Vector2(1, 1);
            playerInfoRect.anchoredPosition = new Vector2(-20, -20);
            playerInfoRect.sizeDelta = new Vector2(250, 400);

            // 玩家信息容器
            GameObject playerContainer = CreatePanel("PlayerInfoContainer", playerInfoUI.transform);
            playerContainer.AddComponent<VerticalLayoutGroup>();

            // 创建DialogUI面板
            GameObject dialogUI = CreatePanel("DialogUI", canvasObj.transform);
            dialogUI.AddComponent<UI.DialogUI>();
            AddCanvasGroup(dialogUI);
            dialogUI.SetActive(false);

            // 对话框背景
            Image dialogBg = dialogUI.GetComponent<Image>();
            dialogBg.color = new Color(0, 0, 0, 0.5f);

            GameObject dialogPanel = CreatePanel("DialogPanel", dialogUI.transform);
            RectTransform dialogPanelRect = dialogPanel.GetComponent<RectTransform>();
            dialogPanelRect.sizeDelta = new Vector2(500, 300);
            Image panelBg = dialogPanel.GetComponent<Image>();
            panelBg.color = Color.white;

            CreateText("TitleText", dialogPanel.transform, "标题", 28);
            CreateText("MessageText", dialogPanel.transform, "消息内容", 20);
            CreateButton("ConfirmButton", dialogPanel.transform, "确定", new Vector2(-80, -100));
            CreateButton("CancelButton", dialogPanel.transform, "取消", new Vector2(80, -100));

            // 创建PauseMenuUI面板
            GameObject pauseMenuUI = CreatePanel("PauseMenuUI", canvasObj.transform);
            pauseMenuUI.AddComponent<UI.PauseMenuUI>();
            AddCanvasGroup(pauseMenuUI);
            pauseMenuUI.SetActive(false);

            Image pauseBg = pauseMenuUI.GetComponent<Image>();
            pauseBg.color = new Color(0, 0, 0, 0.7f);

            GameObject pausePanel = CreatePanel("PausePanel", pauseMenuUI.transform);
            RectTransform pausePanelRect = pausePanel.GetComponent<RectTransform>();
            pausePanelRect.sizeDelta = new Vector2(400, 400);

            CreateText("PauseTitle", pausePanel.transform, "游戏暂停", 36);
            CreateButton("ResumeButton", pausePanel.transform, "继续游戏", new Vector2(0, 40));
            CreateButton("SettingsButton", pausePanel.transform, "设置", new Vector2(0, -20));
            CreateButton("SaveButton", pausePanel.transform, "保存游戏", new Vector2(0, -80));
            CreateButton("MainMenuButton", pausePanel.transform, "返回主菜单", new Vector2(0, -140));

            Debug.Log("游戏UI Canvas创建完成！");
        }

        private static void CreateMainMenuUICanvas()
        {
            // 检查是否已有EventSystem
            if (FindObjectOfType<EventSystem>() == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<EventSystem>();
                eventSystem.AddComponent<StandaloneInputModule>();
            }

            // 创建Canvas
            GameObject canvasObj = new GameObject("MainMenuCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;

            canvasObj.AddComponent<GraphicRaycaster>();

            // 创建MainMenuUI
            GameObject mainMenuUI = CreatePanel("MainMenuUI", canvasObj.transform);
            mainMenuUI.AddComponent<UI.MainMenuUI>();
            AddCanvasGroup(mainMenuUI);

            // 背景
            Image bg = mainMenuUI.GetComponent<Image>();
            bg.color = new Color(0.2f, 0.3f, 0.5f);

            // 标题
            GameObject title = CreateText("Title", mainMenuUI.transform, "大富翁4", 72);
            RectTransform titleRect = title.GetComponent<RectTransform>();
            titleRect.anchoredPosition = new Vector2(0, 200);

            // 按钮
            CreateButton("NewGameButton", mainMenuUI.transform, "新游戏", new Vector2(0, 50));
            CreateButton("LoadGameButton", mainMenuUI.transform, "继续游戏", new Vector2(0, -20));
            CreateButton("SettingsButton", mainMenuUI.transform, "设置", new Vector2(0, -90));
            CreateButton("ExitButton", mainMenuUI.transform, "退出", new Vector2(0, -160));

            // 游戏设置面板（初始隐藏）
            GameObject setupPanel = CreatePanel("GameSetupPanel", mainMenuUI.transform);
            setupPanel.SetActive(false);
            RectTransform setupRect = setupPanel.GetComponent<RectTransform>();
            setupRect.sizeDelta = new Vector2(600, 500);
            Image setupBg = setupPanel.GetComponent<Image>();
            setupBg.color = new Color(0.9f, 0.9f, 0.9f);

            CreateText("SetupTitle", setupPanel.transform, "游戏设置", 36);
            CreateText("PlayerCountLabel", setupPanel.transform, "玩家数量: 1", 24);
            CreateText("AICountLabel", setupPanel.transform, "AI数量: 1", 24);
            CreateButton("StartButton", setupPanel.transform, "开始游戏", new Vector2(0, -150));
            CreateButton("BackButton", setupPanel.transform, "返回", new Vector2(0, -220));

            Debug.Log("主菜单UI Canvas创建完成！");
        }

        #endregion

        #region 摄像机设置

        private static void Setup2DCamera()
        {
            Camera mainCamera = Camera.main;
            if (mainCamera == null)
            {
                GameObject cameraObj = new GameObject("Main Camera");
                cameraObj.tag = "MainCamera";
                mainCamera = cameraObj.AddComponent<Camera>();
                cameraObj.AddComponent<AudioListener>();
            }

            mainCamera.orthographic = true;
            mainCamera.orthographicSize = 8;
            mainCamera.transform.position = new Vector3(5, 5, -10);
            mainCamera.backgroundColor = new Color(0.2f, 0.2f, 0.3f);
            mainCamera.clearFlags = CameraClearFlags.SolidColor;

            Debug.Log("2D摄像机设置完成！");
        }

        #endregion

        #region 一键设置场景

        private static void SetupGameScene()
        {
            Setup2DCamera();
            CreateAllManagers();
            CreateGameUICanvas();
            Debug.Log("Game场景设置完成！");
        }

        private static void SetupMainMenuScene()
        {
            // 设置摄像机
            Camera mainCamera = Camera.main;
            if (mainCamera == null)
            {
                GameObject cameraObj = new GameObject("Main Camera");
                cameraObj.tag = "MainCamera";
                mainCamera = cameraObj.AddComponent<Camera>();
                cameraObj.AddComponent<AudioListener>();
            }
            mainCamera.backgroundColor = new Color(0.1f, 0.1f, 0.2f);
            mainCamera.clearFlags = CameraClearFlags.SolidColor;

            CreateMainMenuUICanvas();
            Debug.Log("MainMenu场景设置完成！");
        }

        #endregion

        #region UI辅助方法

        private static GameObject CreatePanel(string name, Transform parent)
        {
            GameObject panel = new GameObject(name);
            panel.transform.SetParent(parent);

            RectTransform rect = panel.AddComponent<RectTransform>();
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            Image image = panel.AddComponent<Image>();
            image.color = new Color(0, 0, 0, 0); // 透明

            return panel;
        }

        private static GameObject CreateText(string name, Transform parent, string text, int fontSize)
        {
            GameObject textObj = new GameObject(name);
            textObj.transform.SetParent(parent);

            RectTransform rect = textObj.AddComponent<RectTransform>();
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(300, 50);

            // 尝试使用TextMeshPro，如果不可用则使用普通Text
            var tmp = textObj.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = fontSize;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.color = Color.white;

            return textObj;
        }

        private static GameObject CreateButton(string name, Transform parent, string text, Vector2 position,
            Vector2? anchorMin = null, Vector2? anchorMax = null, Vector2? size = null)
        {
            GameObject buttonObj = new GameObject(name);
            buttonObj.transform.SetParent(parent);

            RectTransform rect = buttonObj.AddComponent<RectTransform>();
            rect.anchorMin = anchorMin ?? new Vector2(0.5f, 0.5f);
            rect.anchorMax = anchorMax ?? new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = position;
            rect.sizeDelta = size ?? new Vector2(200, 50);

            Image image = buttonObj.AddComponent<Image>();
            image.color = new Color(0.3f, 0.5f, 0.8f);

            Button button = buttonObj.AddComponent<Button>();
            ColorBlock colors = button.colors;
            colors.highlightedColor = new Color(0.4f, 0.6f, 0.9f);
            colors.pressedColor = new Color(0.2f, 0.4f, 0.7f);
            button.colors = colors;

            // 按钮文字
            GameObject textObj = new GameObject("Text");
            textObj.transform.SetParent(buttonObj.transform);

            RectTransform textRect = textObj.AddComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;

            var tmp = textObj.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.fontSize = 20;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.color = Color.white;

            return buttonObj;
        }

        private static void AddCanvasGroup(GameObject obj)
        {
            CanvasGroup cg = obj.AddComponent<CanvasGroup>();
            cg.alpha = 1;
            cg.interactable = true;
            cg.blocksRaycasts = true;
        }

        #endregion
    }
}
#endif
