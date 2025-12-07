using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Board
{
    /// <summary>
    /// 棋盘管理器 - 管理棋盘和所有格子
    /// </summary>
    public class BoardManager : MonoBehaviour
    {
        [Header("棋盘设置")]
        [SerializeField] private int _boardWidth = 7;  // 每边的格子数
        [SerializeField] private int _boardHeight = 7;
        [SerializeField] private float _tileSpacing = 1.5f; // 格子间距

        [Header("预制体")]
        [SerializeField] private GameObject _propertyTilePrefab;
        [SerializeField] private GameObject _startTilePrefab;
        [SerializeField] private GameObject _bankTilePrefab;
        [SerializeField] private GameObject _shopTilePrefab;
        [SerializeField] private GameObject _newsTilePrefab;
        [SerializeField] private GameObject _lotteryTilePrefab;
        [SerializeField] private GameObject _hospitalTilePrefab;
        [SerializeField] private GameObject _prisonTilePrefab;
        [SerializeField] private GameObject _parkTilePrefab;
        [SerializeField] private GameObject _taxTilePrefab;

        [Header("地图数据")]
        [SerializeField] private MapData _mapData;

        [Header("已生成的格子")]
        [SerializeField] private List<Tile> _tiles = new List<Tile>();

        public int TotalTiles => _tiles.Count;
        public IReadOnlyList<Tile> Tiles => _tiles;

        private void Start()
        {
            if (_mapData != null)
            {
                GenerateBoardFromData(_mapData);
            }
            else
            {
                GenerateDefaultBoard();
            }
        }

        #region 棋盘生成

        /// <summary>
        /// 从地图数据生成棋盘
        /// </summary>
        public void GenerateBoardFromData(MapData mapData)
        {
            ClearBoard();

            foreach (var tileData in mapData.Tiles)
            {
                CreateTile(tileData, _tiles.Count);
            }

            Debug.Log($"棋盘生成完成，共 {_tiles.Count} 个格子");
        }

        /// <summary>
        /// 生成默认棋盘
        /// </summary>
        public void GenerateDefaultBoard()
        {
            ClearBoard();

            // 生成一个正方形棋盘
            // 计算每边需要的格子数
            int tilesPerSide = (_boardWidth - 1) + (_boardHeight - 1);
            int totalTiles = tilesPerSide * 4;

            Vector3 startPosition = transform.position;

            // 默认格子布局
            TileType[] defaultLayout = GetDefaultLayout(totalTiles);

            int tileIndex = 0;

            // 底边（从左到右）
            for (int i = 0; i < _boardWidth; i++)
            {
                Vector3 position = startPosition + new Vector3(i * _tileSpacing, 0, 0);
                CreateTileAtPosition(defaultLayout[tileIndex], position, tileIndex);
                tileIndex++;
            }

            // 右边（从下到上）
            for (int i = 1; i < _boardHeight; i++)
            {
                Vector3 position = startPosition + new Vector3((_boardWidth - 1) * _tileSpacing, i * _tileSpacing, 0);
                CreateTileAtPosition(defaultLayout[tileIndex], position, tileIndex);
                tileIndex++;
            }

            // 顶边（从右到左）
            for (int i = _boardWidth - 2; i >= 0; i--)
            {
                Vector3 position = startPosition + new Vector3(i * _tileSpacing, (_boardHeight - 1) * _tileSpacing, 0);
                CreateTileAtPosition(defaultLayout[tileIndex], position, tileIndex);
                tileIndex++;
            }

            // 左边（从上到下）
            for (int i = _boardHeight - 2; i > 0; i--)
            {
                Vector3 position = startPosition + new Vector3(0, i * _tileSpacing, 0);
                CreateTileAtPosition(defaultLayout[tileIndex], position, tileIndex);
                tileIndex++;
            }

            Debug.Log($"默认棋盘生成完成，共 {_tiles.Count} 个格子");
        }

        private TileType[] GetDefaultLayout(int totalTiles)
        {
            // 创建默认布局
            TileType[] layout = new TileType[totalTiles];

            // 固定格子位置
            layout[0] = TileType.Start;          // 起点

            // 特殊格子位置（均匀分布）
            int quarterTiles = totalTiles / 4;

            layout[quarterTiles] = TileType.Prison;
            layout[quarterTiles * 2] = TileType.Park;
            layout[quarterTiles * 3] = TileType.Hospital;

            // 其他特殊格子
            layout[2] = TileType.Chance;
            layout[5] = TileType.Shop;
            layout[8] = TileType.Tax;
            layout[11] = TileType.Bank;
            layout[15] = TileType.Lottery;
            layout[18] = TileType.News;
            layout[22] = TileType.Fate;

            // 剩余的都是地产
            for (int i = 0; i < totalTiles; i++)
            {
                if (layout[i] == 0 && i != 0) // 0 表示还没设置
                {
                    layout[i] = TileType.Property;
                }
            }

            return layout;
        }

        private void CreateTileAtPosition(TileType type, Vector3 position, int index)
        {
            GameObject prefab = GetTilePrefab(type);
            if (prefab == null)
            {
                prefab = _propertyTilePrefab; // 默认使用地产预制体
            }

            if (prefab != null)
            {
                GameObject tileObj = Instantiate(prefab, position, Quaternion.identity, transform);
                tileObj.name = $"Tile_{index}_{type}";

                Tile tile = tileObj.GetComponent<Tile>();
                if (tile != null)
                {
                    tile.Initialize(index);
                    _tiles.Add(tile);
                }
            }
            else
            {
                // 如果没有预制体，创建空格子
                GameObject tileObj = new GameObject($"Tile_{index}_{type}");
                tileObj.transform.position = position;
                tileObj.transform.SetParent(transform);

                // 根据类型添加对应的Tile组件
                Tile tile = AddTileComponent(tileObj, type);
                if (tile != null)
                {
                    tile.Initialize(index);
                    _tiles.Add(tile);
                }
            }
        }

        private Tile AddTileComponent(GameObject obj, TileType type)
        {
            switch (type)
            {
                case TileType.Start:
                    return obj.AddComponent<StartTile>();
                case TileType.Property:
                    var propTile = obj.AddComponent<PropertyTile>();
                    obj.AddComponent<Economy.Property>(); // 添加Property组件
                    return propTile;
                case TileType.Bank:
                    return obj.AddComponent<BankTile>();
                case TileType.Shop:
                    return obj.AddComponent<ShopTile>();
                case TileType.News:
                    return obj.AddComponent<NewsTile>();
                case TileType.Lottery:
                    return obj.AddComponent<LotteryTile>();
                case TileType.Hospital:
                    return obj.AddComponent<HospitalTile>();
                case TileType.Prison:
                    return obj.AddComponent<PrisonTile>();
                case TileType.Park:
                    return obj.AddComponent<ParkTile>();
                case TileType.Tax:
                    return obj.AddComponent<TaxTile>();
                default:
                    return obj.AddComponent<ParkTile>(); // 默认
            }
        }

        private void CreateTile(TileData data, int index)
        {
            GameObject prefab = GetTilePrefab(data.Type);
            // TODO: 从数据创建格子
        }

        private GameObject GetTilePrefab(TileType type)
        {
            switch (type)
            {
                case TileType.Start: return _startTilePrefab;
                case TileType.Property: return _propertyTilePrefab;
                case TileType.Bank: return _bankTilePrefab;
                case TileType.Shop: return _shopTilePrefab;
                case TileType.News: return _newsTilePrefab;
                case TileType.Lottery: return _lotteryTilePrefab;
                case TileType.Hospital: return _hospitalTilePrefab;
                case TileType.Prison: return _prisonTilePrefab;
                case TileType.Park: return _parkTilePrefab;
                case TileType.Tax: return _taxTilePrefab;
                default: return null;
            }
        }

        private void ClearBoard()
        {
            foreach (var tile in _tiles)
            {
                if (tile != null)
                {
                    Destroy(tile.gameObject);
                }
            }
            _tiles.Clear();
        }

        #endregion

        #region 格子查询

        /// <summary>
        /// 获取指定索引的格子
        /// </summary>
        public Tile GetTile(int index)
        {
            if (index < 0 || index >= _tiles.Count)
            {
                Debug.LogWarning($"格子索引越界: {index}");
                return null;
            }
            return _tiles[index];
        }

        /// <summary>
        /// 获取指定索引格子的位置
        /// </summary>
        public Vector3 GetTilePosition(int index)
        {
            Tile tile = GetTile(index);
            if (tile != null)
            {
                return tile.GetStandPosition();
            }
            return Vector3.zero;
        }

        /// <summary>
        /// 根据类型查找格子索引
        /// </summary>
        public int GetTileIndexByType(TileType type)
        {
            for (int i = 0; i < _tiles.Count; i++)
            {
                if (_tiles[i].Type == type)
                {
                    return i;
                }
            }
            return -1;
        }

        /// <summary>
        /// 获取所有指定类型的格子
        /// </summary>
        public List<Tile> GetTilesByType(TileType type)
        {
            List<Tile> result = new List<Tile>();
            foreach (var tile in _tiles)
            {
                if (tile.Type == type)
                {
                    result.Add(tile);
                }
            }
            return result;
        }

        /// <summary>
        /// 计算两个格子之间的距离（步数）
        /// </summary>
        public int GetDistanceBetween(int fromIndex, int toIndex)
        {
            int distance = toIndex - fromIndex;
            if (distance < 0)
            {
                distance += _tiles.Count;
            }
            return distance;
        }

        #endregion

        #region 玩家位置

        /// <summary>
        /// 获取指定格子上的所有玩家
        /// </summary>
        public List<PlayerController> GetPlayersOnTile(int tileIndex)
        {
            List<PlayerController> players = new List<PlayerController>();
            foreach (var player in Core.GameManager.Instance.Players)
            {
                if (player.CurrentTileIndex == tileIndex)
                {
                    players.Add(player);
                }
            }
            return players;
        }

        #endregion
    }

    /// <summary>
    /// 地图数据配置
    /// </summary>
    [CreateAssetMenu(fileName = "NewMapData", menuName = "RichMan/Map Data")]
    public class MapData : ScriptableObject
    {
        public string MapName;
        public string Description;
        public Sprite MapBackground;
        public List<TileData> Tiles = new List<TileData>();
    }
}
