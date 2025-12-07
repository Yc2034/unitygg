using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Board
{
    /// <summary>
    /// 格子基类 - 所有格子类型的父类
    /// </summary>
    public abstract class Tile : MonoBehaviour
    {
        [Header("基本信息")]
        [SerializeField] protected string _tileName;
        [SerializeField] protected TileType _tileType;
        [SerializeField] protected int _tileIndex;
        [SerializeField] protected Sprite _tileSprite;

        [Header("视觉")]
        [SerializeField] protected SpriteRenderer _spriteRenderer;
        [SerializeField] protected Transform _playerStandPoint; // 玩家站立点

        // 属性
        public string TileName => _tileName;
        public TileType Type => _tileType;
        public int TileIndex
        {
            get => _tileIndex;
            set => _tileIndex = value;
        }

        /// <summary>
        /// 获取玩家站立位置
        /// </summary>
        public Vector3 GetStandPosition(int playerIndex = 0)
        {
            if (_playerStandPoint != null)
            {
                // 多个玩家时稍微偏移
                Vector3 offset = new Vector3(playerIndex * 0.3f, playerIndex * 0.1f, 0);
                return _playerStandPoint.position + offset;
            }
            return transform.position;
        }

        protected virtual void Awake()
        {
            if (_spriteRenderer == null)
                _spriteRenderer = GetComponent<SpriteRenderer>();
        }

        /// <summary>
        /// 初始化格子
        /// </summary>
        public virtual void Initialize(int index, TileData data = null)
        {
            _tileIndex = index;
            if (data != null)
            {
                _tileName = data.TileName;
                _tileType = data.Type;
                if (data.TileSprite != null && _spriteRenderer != null)
                {
                    _spriteRenderer.sprite = data.TileSprite;
                }
            }
        }

        /// <summary>
        /// 当玩家到达此格子时触发
        /// </summary>
        public abstract void OnPlayerLand(PlayerController player);

        /// <summary>
        /// 当玩家经过此格子时触发（不停留）
        /// </summary>
        public virtual void OnPlayerPass(PlayerController player)
        {
            // 默认经过时不做任何事，子类可重写
        }

        /// <summary>
        /// 获取格子描述
        /// </summary>
        public virtual string GetDescription()
        {
            return _tileName;
        }
    }

    /// <summary>
    /// 格子数据配置（ScriptableObject）
    /// </summary>
    [CreateAssetMenu(fileName = "NewTileData", menuName = "RichMan/Tile Data")]
    public class TileData : ScriptableObject
    {
        public string TileName;
        public TileType Type;
        public Sprite TileSprite;
        public string Description;

        [Header("地产专用")]
        public bool IsProperty;
        public int BasePrice;
        public int BaseRent;
        public PropertyRegion Region;
    }
}
