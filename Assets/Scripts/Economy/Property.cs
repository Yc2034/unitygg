using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Economy
{
    /// <summary>
    /// 地产类 - 管理单个地产的数据和操作
    /// </summary>
    public class Property : MonoBehaviour
    {
        [Header("基本信息")]
        [SerializeField] private string _propertyName;
        [SerializeField] private int _tileIndex;
        [SerializeField] private PropertyRegion _region = PropertyRegion.Suburb;

        [Header("价格设置")]
        [SerializeField] private int _basePrice = 1000;
        [SerializeField] private int _baseRent = 100;
        [SerializeField] private float _upgradePriceMultiplier = 0.5f; // 升级费用 = 基础价格 * 等级 * 此系数

        [Header("当前状态")]
        [SerializeField] private int _level = 0; // 0=空地, 1=平房, 2=楼房, 3=旅馆
        [SerializeField] private bool _isMortgaged = false;

        // 所有者
        private PlayerController _owner;

        // 属性访问器
        public string PropertyName => _propertyName;
        public int TileIndex => _tileIndex;
        public PropertyRegion Region => _region;
        public int Level => _level;
        public bool IsMortgaged => _isMortgaged;
        public PlayerController Owner => _owner;

        /// <summary>
        /// 购买价格
        /// </summary>
        public int PurchasePrice
        {
            get
            {
                float regionMultiplier = GetRegionMultiplier();
                return Mathf.RoundToInt(_basePrice * regionMultiplier);
            }
        }

        /// <summary>
        /// 当前租金
        /// </summary>
        public int CurrentRent
        {
            get
            {
                if (_isMortgaged || _level == 0) return 0;
                return GetRentAtLevel(_level);
            }
        }

        /// <summary>
        /// 升级费用
        /// </summary>
        public int UpgradeCost
        {
            get
            {
                if (!CanUpgrade()) return 0;
                return Mathf.RoundToInt(_basePrice * (_level + 1) * _upgradePriceMultiplier);
            }
        }

        /// <summary>
        /// 抵押价值（可获得的金额）
        /// </summary>
        public int MortgageValue
        {
            get
            {
                return Mathf.RoundToInt(GetTotalValue() * 0.5f);
            }
        }

        /// <summary>
        /// 赎回费用
        /// </summary>
        public int RedeemCost
        {
            get
            {
                return Mathf.RoundToInt(MortgageValue * 1.1f); // 10%利息
            }
        }

        /// <summary>
        /// 初始化地产
        /// </summary>
        public void Initialize(string name, int tileIndex, int basePrice, int baseRent, PropertyRegion region)
        {
            _propertyName = name;
            _tileIndex = tileIndex;
            _basePrice = basePrice;
            _baseRent = baseRent;
            _region = region;
            _level = 0;
            _owner = null;
            _isMortgaged = false;
        }

        #region 等级和租金

        /// <summary>
        /// 获取指定等级的租金
        /// </summary>
        public int GetRentAtLevel(int level)
        {
            float regionMultiplier = GetRegionMultiplier();
            float levelMultiplier = GetLevelMultiplier(level);
            return Mathf.RoundToInt(_baseRent * regionMultiplier * levelMultiplier);
        }

        private float GetRegionMultiplier()
        {
            switch (_region)
            {
                case PropertyRegion.Suburb: return 1.0f;
                case PropertyRegion.Downtown: return 1.5f;
                case PropertyRegion.Commercial: return 2.0f;
                case PropertyRegion.Luxury: return 3.0f;
                default: return 1.0f;
            }
        }

        private float GetLevelMultiplier(int level)
        {
            switch (level)
            {
                case 0: return 0f;       // 空地无租金
                case 1: return Constants.RentMultiplierLevel1;
                case 2: return Constants.RentMultiplierLevel2;
                case 3: return Constants.RentMultiplierLevel3;
                default: return 1.0f;
            }
        }

        /// <summary>
        /// 检查是否可以升级
        /// </summary>
        public bool CanUpgrade()
        {
            return _owner != null && _level < Constants.MaxPropertyLevel && !_isMortgaged;
        }

        /// <summary>
        /// 升级地产
        /// </summary>
        public bool Upgrade()
        {
            if (!CanUpgrade())
            {
                return false;
            }

            _level++;
            Debug.Log($"{_propertyName} 升级到等级 {_level}");
            return true;
        }

        /// <summary>
        /// 降级地产（被拆除）
        /// </summary>
        public void Downgrade()
        {
            if (_level > 0)
            {
                _level--;
                Debug.Log($"{_propertyName} 降级到等级 {_level}");
            }
        }

        #endregion

        #region 所有权

        /// <summary>
        /// 设置所有者
        /// </summary>
        public void SetOwner(PlayerController newOwner)
        {
            if (_owner != newOwner)
            {
                PlayerController previousOwner = _owner;
                _owner = newOwner;

                if (previousOwner != null)
                {
                    previousOwner.LoseProperty(this);
                }

                if (newOwner != null && _level == 0)
                {
                    // 购买后自动升级到1级（有房子）
                    _level = 1;
                }

                Debug.Log($"{_propertyName} 所有者变更为 {(newOwner != null ? newOwner.PlayerName : "无")}");
            }
        }

        /// <summary>
        /// 检查是否属于指定玩家
        /// </summary>
        public bool IsOwnedBy(PlayerController player)
        {
            return _owner == player;
        }

        #endregion

        #region 抵押

        /// <summary>
        /// 抵押地产
        /// </summary>
        public bool Mortgage()
        {
            if (_isMortgaged || _owner == null)
            {
                return false;
            }

            _isMortgaged = true;
            _owner.AddMoney(MortgageValue);
            Debug.Log($"{_propertyName} 已抵押，获得 ${MortgageValue}");
            return true;
        }

        /// <summary>
        /// 赎回抵押
        /// </summary>
        public bool Redeem()
        {
            if (!_isMortgaged || _owner == null)
            {
                return false;
            }

            int cost = RedeemCost;
            if (_owner.SpendMoney(cost))
            {
                _isMortgaged = false;
                Debug.Log($"{_propertyName} 已赎回，花费 ${cost}");
                return true;
            }

            return false;
        }

        #endregion

        #region 价值计算

        /// <summary>
        /// 获取地产总价值（包括建筑）
        /// </summary>
        public int GetTotalValue()
        {
            int value = PurchasePrice;

            // 加上建筑投资
            for (int i = 1; i <= _level; i++)
            {
                value += Mathf.RoundToInt(_basePrice * i * _upgradePriceMultiplier);
            }

            return value;
        }

        /// <summary>
        /// 获取出售价格（总价值的一定比例）
        /// </summary>
        public int GetSellPrice()
        {
            return Mathf.RoundToInt(GetTotalValue() * 0.7f);
        }

        #endregion

        /// <summary>
        /// 获取地产信息描述
        /// </summary>
        public string GetInfo()
        {
            string info = $"== {_propertyName} ==\n";
            info += $"区域: {_region}\n";
            info += $"等级: {_level}/{Constants.MaxPropertyLevel}\n";
            info += $"购买价格: ${PurchasePrice}\n";
            info += $"当前租金: ${CurrentRent}\n";

            if (CanUpgrade())
            {
                info += $"升级费用: ${UpgradeCost}\n";
                info += $"升级后租金: ${GetRentAtLevel(_level + 1)}\n";
            }

            info += $"总价值: ${GetTotalValue()}\n";
            info += $"抵押价值: ${MortgageValue}\n";

            if (_owner != null)
            {
                info += $"所有者: {_owner.PlayerName}\n";
            }

            if (_isMortgaged)
            {
                info += "[已抵押]\n";
            }

            return info;
        }
    }
}
