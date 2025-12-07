#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

namespace RichMan.Editor
{
    /// <summary>
    /// 游戏设置编辑器工具 - 帮助快速创建游戏所需资源
    /// </summary>
    public class GameSetupEditor : EditorWindow
    {
        [MenuItem("RichMan/Game Setup Window")]
        public static void ShowWindow()
        {
            GetWindow<GameSetupEditor>("大富翁4 设置工具");
        }

        private void OnGUI()
        {
            GUILayout.Label("大富翁4 快速设置工具", EditorStyles.boldLabel);
            GUILayout.Space(10);

            EditorGUILayout.HelpBox("使用此工具快速创建游戏所需的场景、预制体和配置文件", MessageType.Info);
            GUILayout.Space(10);

            // 场景创建
            GUILayout.Label("1. 创建场景", EditorStyles.boldLabel);
            if (GUILayout.Button("创建所有场景"))
            {
                CreateAllScenes();
            }
            GUILayout.Space(10);

            // 预制体创建
            GUILayout.Label("2. 创建基础预制体", EditorStyles.boldLabel);
            if (GUILayout.Button("创建管理器预制体"))
            {
                CreateManagerPrefabs();
            }
            if (GUILayout.Button("创建格子预制体"))
            {
                CreateTilePrefabs();
            }
            if (GUILayout.Button("创建玩家预制体"))
            {
                CreatePlayerPrefab();
            }
            GUILayout.Space(10);

            // ScriptableObject创建
            GUILayout.Label("3. 创建配置文件", EditorStyles.boldLabel);
            if (GUILayout.Button("创建示例角色配置"))
            {
                CreateSampleCharacters();
            }
            if (GUILayout.Button("创建示例卡片配置"))
            {
                CreateSampleCards();
            }
            if (GUILayout.Button("创建示例地图配置"))
            {
                CreateSampleMap();
            }
            GUILayout.Space(10);

            // 一键设置
            GUILayout.Label("4. 一键设置", EditorStyles.boldLabel);
            GUI.backgroundColor = Color.green;
            if (GUILayout.Button("一键创建所有基础资源", GUILayout.Height(40)))
            {
                CreateAllBasicResources();
            }
            GUI.backgroundColor = Color.white;
        }

        #region 场景创建

        private static void CreateAllScenes()
        {
            CreateScene("MainMenu");
            CreateScene("Game");
            CreateScene("Loading");
            Debug.Log("所有场景创建完成！请在 Assets/Scenes 文件夹中查看");
        }

        private static void CreateScene(string sceneName)
        {
            string scenePath = $"Assets/Scenes/{sceneName}.unity";

            // 确保目录存在
            if (!Directory.Exists("Assets/Scenes"))
            {
                Directory.CreateDirectory("Assets/Scenes");
            }

            // 创建新场景
            var scene = UnityEditor.SceneManagement.EditorSceneManager.NewScene(
                UnityEditor.SceneManagement.NewSceneSetup.DefaultGameObjects,
                UnityEditor.SceneManagement.NewSceneMode.Single);

            // 保存场景
            UnityEditor.SceneManagement.EditorSceneManager.SaveScene(scene, scenePath);
            Debug.Log($"场景 {sceneName} 创建成功: {scenePath}");
        }

        #endregion

        #region 预制体创建

        private static void CreateManagerPrefabs()
        {
            // 创建GameManager预制体
            GameObject gameManager = new GameObject("GameManager");
            gameManager.AddComponent<Core.GameManager>();
            SavePrefab(gameManager, "Assets/Prefabs/Managers/GameManager.prefab");

            // 创建TurnManager预制体
            GameObject turnManager = new GameObject("TurnManager");
            turnManager.AddComponent<Core.TurnManager>();
            SavePrefab(turnManager, "Assets/Prefabs/Managers/TurnManager.prefab");

            // 创建BoardManager预制体
            GameObject boardManager = new GameObject("BoardManager");
            boardManager.AddComponent<Board.BoardManager>();
            SavePrefab(boardManager, "Assets/Prefabs/Managers/BoardManager.prefab");

            // 创建DiceManager预制体
            GameObject diceManager = new GameObject("DiceManager");
            diceManager.AddComponent<Dice.DiceManager>();
            SavePrefab(diceManager, "Assets/Prefabs/Managers/DiceManager.prefab");

            // 创建UIManager预制体
            GameObject uiManager = new GameObject("UIManager");
            uiManager.AddComponent<UI.UIManager>();
            SavePrefab(uiManager, "Assets/Prefabs/Managers/UIManager.prefab");

            // 创建AudioManager预制体
            GameObject audioManager = new GameObject("AudioManager");
            audioManager.AddComponent<Audio.AudioManager>();
            SavePrefab(audioManager, "Assets/Prefabs/Managers/AudioManager.prefab");

            Debug.Log("管理器预制体创建完成！");
        }

        private static void CreateTilePrefabs()
        {
            // 创建基础格子预制体
            CreateBasicTilePrefab("PropertyTile", typeof(Board.PropertyTile), typeof(Economy.Property));
            CreateBasicTilePrefab("StartTile", typeof(Board.StartTile));
            CreateBasicTilePrefab("BankTile", typeof(Board.BankTile));
            CreateBasicTilePrefab("ShopTile", typeof(Board.ShopTile));
            CreateBasicTilePrefab("NewsTile", typeof(Board.NewsTile));
            CreateBasicTilePrefab("LotteryTile", typeof(Board.LotteryTile));
            CreateBasicTilePrefab("HospitalTile", typeof(Board.HospitalTile));
            CreateBasicTilePrefab("PrisonTile", typeof(Board.PrisonTile));
            CreateBasicTilePrefab("ParkTile", typeof(Board.ParkTile));
            CreateBasicTilePrefab("TaxTile", typeof(Board.TaxTile));

            Debug.Log("格子预制体创建完成！");
        }

        private static void CreateBasicTilePrefab(string name, params System.Type[] components)
        {
            GameObject tile = new GameObject(name);

            // 添加SpriteRenderer
            var sr = tile.AddComponent<SpriteRenderer>();
            sr.color = GetTileColor(name);

            // 添加BoxCollider2D
            var collider = tile.AddComponent<BoxCollider2D>();
            collider.size = new Vector2(1, 1);

            // 添加指定的组件
            foreach (var component in components)
            {
                tile.AddComponent(component);
            }

            // 创建玩家站立点
            GameObject standPoint = new GameObject("StandPoint");
            standPoint.transform.SetParent(tile.transform);
            standPoint.transform.localPosition = new Vector3(0, 0.2f, 0);

            SavePrefab(tile, $"Assets/Prefabs/Tiles/{name}.prefab");
        }

        private static Color GetTileColor(string tileName)
        {
            switch (tileName)
            {
                case "PropertyTile": return new Color(0.4f, 0.8f, 0.4f); // 绿色
                case "StartTile": return new Color(1f, 0.8f, 0.2f);      // 金色
                case "BankTile": return new Color(0.2f, 0.6f, 1f);       // 蓝色
                case "ShopTile": return new Color(1f, 0.5f, 0.8f);       // 粉色
                case "HospitalTile": return new Color(1f, 1f, 1f);       // 白色
                case "PrisonTile": return new Color(0.3f, 0.3f, 0.3f);   // 灰色
                case "ParkTile": return new Color(0.5f, 1f, 0.5f);       // 浅绿
                case "TaxTile": return new Color(1f, 0.3f, 0.3f);        // 红色
                default: return new Color(0.8f, 0.8f, 0.8f);             // 默认灰色
            }
        }

        private static void CreatePlayerPrefab()
        {
            GameObject player = new GameObject("Player");

            // 添加SpriteRenderer
            var sr = player.AddComponent<SpriteRenderer>();
            sr.color = Color.blue;
            sr.sortingOrder = 10; // 确保在格子之上显示

            // 添加组件
            player.AddComponent<Player.PlayerController>();

            // 添加Animator（空的，稍后配置）
            player.AddComponent<Animator>();

            SavePrefab(player, "Assets/Prefabs/Characters/Player.prefab");

            // 创建AI玩家预制体
            GameObject aiPlayer = new GameObject("AIPlayer");
            var aiSr = aiPlayer.AddComponent<SpriteRenderer>();
            aiSr.color = Color.red;
            aiSr.sortingOrder = 10;
            aiPlayer.AddComponent<Player.PlayerController>();
            aiPlayer.AddComponent<Player.AIController>();
            aiPlayer.AddComponent<Animator>();

            SavePrefab(aiPlayer, "Assets/Prefabs/Characters/AIPlayer.prefab");

            Debug.Log("玩家预制体创建完成！");
        }

        #endregion

        #region ScriptableObject创建

        private static void CreateSampleCharacters()
        {
            EnsureDirectoryExists("Assets/ScriptableObjects/Characters");

            string[] names = { "阿土伯", "钱夫人", "孙小美", "金贝贝" };
            Color[] colors = { Color.blue, Color.red, Color.green, Color.yellow };

            for (int i = 0; i < names.Length; i++)
            {
                var character = ScriptableObject.CreateInstance<Player.CharacterData>();
                character.CharacterName = names[i];
                character.Description = $"大富翁4经典角色 - {names[i]}";
                character.ThemeColor = colors[i];

                AssetDatabase.CreateAsset(character, $"Assets/ScriptableObjects/Characters/{names[i]}.asset");
            }

            AssetDatabase.SaveAssets();
            Debug.Log("角色配置创建完成！");
        }

        private static void CreateSampleCards()
        {
            EnsureDirectoryExists("Assets/ScriptableObjects/Cards");

            // 创建一些示例卡片
            CreateCardData("RobCard", "抢夺卡", "抢夺目标玩家1000元", Utils.CardType.Rob, 500, true, 1000);
            CreateCardData("DemolishCard", "拆除卡", "拆除目标地产一级建筑", Utils.CardType.Demolish, 800, true);
            CreateCardData("TaxCard", "均贫卡", "将所有玩家的金钱平均分配", Utils.CardType.Tax, 1000, false);
            CreateCardData("TeleportCard", "传送卡", "传送到任意格子", Utils.CardType.Teleport, 600, false);
            CreateCardData("ControlDiceCard", "遥控骰子", "控制下次骰子点数", Utils.CardType.Control, 700, false);
            CreateCardData("SleepCard", "催眠卡", "让目标玩家睡眠2回合", Utils.CardType.Sleep, 500, true, 2);

            AssetDatabase.SaveAssets();
            Debug.Log("卡片配置创建完成！");
        }

        private static void CreateCardData(string id, string name, string desc, Utils.CardType type,
            int price, bool requiresTarget, int effectValue = 0)
        {
            var card = ScriptableObject.CreateInstance<Cards.CardData>();
            card.CardId = id;
            card.CardName = name;
            card.Description = desc;
            card.Type = type;
            card.Price = price;
            card.RequiresTarget = requiresTarget;
            card.EffectValue1 = effectValue;

            AssetDatabase.CreateAsset(card, $"Assets/ScriptableObjects/Cards/{id}.asset");
        }

        private static void CreateSampleMap()
        {
            EnsureDirectoryExists("Assets/ScriptableObjects/Maps");

            var map = ScriptableObject.CreateInstance<Board.MapData>();
            map.MapName = "经典地图";
            map.Description = "大富翁4经典地图布局";

            AssetDatabase.CreateAsset(map, "Assets/ScriptableObjects/Maps/ClassicMap.asset");
            AssetDatabase.SaveAssets();
            Debug.Log("地图配置创建完成！");
        }

        #endregion

        #region 一键创建

        private static void CreateAllBasicResources()
        {
            CreateAllScenes();
            CreateManagerPrefabs();
            CreateTilePrefabs();
            CreatePlayerPrefab();
            CreateSampleCharacters();
            CreateSampleCards();
            CreateSampleMap();

            AssetDatabase.Refresh();
            Debug.Log("========================================");
            Debug.Log("所有基础资源创建完成！");
            Debug.Log("请打开 Game 场景开始设置游戏");
            Debug.Log("========================================");
        }

        #endregion

        #region 辅助方法

        private static void SavePrefab(GameObject obj, string path)
        {
            // 确保目录存在
            string directory = Path.GetDirectoryName(path);
            EnsureDirectoryExists(directory);

            // 保存预制体
            PrefabUtility.SaveAsPrefabAsset(obj, path);

            // 销毁临时对象
            DestroyImmediate(obj);
        }

        private static void EnsureDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
                AssetDatabase.Refresh();
            }
        }

        #endregion
    }
}
#endif
