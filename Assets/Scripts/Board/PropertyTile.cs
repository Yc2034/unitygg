using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Economy;
using RichMan.Core;

namespace RichMan.Board
{
    /// <summary>
    /// 地产格子 - 可购买、升级的格子
    /// </summary>
    public class PropertyTile : Tile
    {
        [Header("地产信息")]
        [SerializeField] private Property _property;

        [Header("视觉")]
        [SerializeField] private SpriteRenderer _ownerIndicator; // 显示所有者颜色
        [SerializeField] private SpriteRenderer[] _houseIndicators; // 显示房屋等级

        public Property Property => _property;

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Property;

            if (_property == null)
            {
                _property = GetComponent<Property>();
            }
        }

        public override void Initialize(int index, TileData data = null)
        {
            base.Initialize(index, data);

            if (_property != null && data != null)
            {
                _property.Initialize(
                    data.TileName,
                    index,
                    data.BasePrice,
                    data.BaseRent,
                    data.Region
                );
            }
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达地产 {_tileName}");

            if (_property == null)
            {
                Debug.LogError("Property component is missing!");
                return;
            }

            if (_property.Owner == null)
            {
                // 空地，可以购买
                HandlePurchaseOption(player);
            }
            else if (_property.Owner == player)
            {
                // 自己的地产，可以升级
                HandleUpgradeOption(player);
            }
            else
            {
                // 别人的地产，需要付租金
                HandleRentPayment(player);
            }
        }

        /// <summary>
        /// 处理购买选项
        /// </summary>
        private void HandlePurchaseOption(PlayerController player)
        {
            int price = _property.PurchasePrice;

            if (!player.CanAfford(price))
            {
                Debug.Log($"{player.PlayerName} 资金不足，无法购买 {_tileName}");
                // TODO: 显示UI提示
                EndTileAction();
                return;
            }

            if (player.IsAI)
            {
                // AI自动决策
                AIController ai = player.GetComponent<AIController>();
                if (ai != null && ai.DecideToBuyProperty(_property))
                {
                    PurchaseProperty(player);
                }
                else
                {
                    Debug.Log($"AI {player.PlayerName} 决定不购买 {_tileName}");
                }
                EndTileAction();
            }
            else
            {
                // 人类玩家，显示购买UI
                // TODO: 通过EventManager触发UI显示
                EventManager.Instance.TriggerEvent(GameEvents.ShowPropertyInfo, new PropertyPurchaseEventData
                {
                    Property = _property,
                    Player = player,
                    OnConfirm = () => PurchaseProperty(player),
                    OnCancel = EndTileAction
                });
            }
        }

        /// <summary>
        /// 购买地产
        /// </summary>
        private void PurchaseProperty(PlayerController player)
        {
            int price = _property.PurchasePrice;

            if (player.SpendMoney(price))
            {
                player.AcquireProperty(_property);
                UpdateVisuals();
                EventManager.Instance.TriggerEvent(GameEvents.PropertyPurchased, _property);
                Debug.Log($"{player.PlayerName} 以 ${price} 购买了 {_tileName}");
            }

            EndTileAction();
        }

        /// <summary>
        /// 处理升级选项
        /// </summary>
        private void HandleUpgradeOption(PlayerController player)
        {
            if (!_property.CanUpgrade())
            {
                Debug.Log($"{_tileName} 已达到最高等级");
                EndTileAction();
                return;
            }

            int upgradeCost = _property.UpgradeCost;

            if (!player.CanAfford(upgradeCost))
            {
                Debug.Log($"{player.PlayerName} 资金不足，无法升级 {_tileName}");
                EndTileAction();
                return;
            }

            if (player.IsAI)
            {
                AIController ai = player.GetComponent<AIController>();
                if (ai != null && ai.DecideToUpgradeProperty(_property))
                {
                    UpgradeProperty(player);
                }
                EndTileAction();
            }
            else
            {
                // TODO: 显示升级UI
                EventManager.Instance.TriggerEvent(GameEvents.ShowPropertyInfo, new PropertyUpgradeEventData
                {
                    Property = _property,
                    Player = player,
                    OnConfirm = () => UpgradeProperty(player),
                    OnCancel = EndTileAction
                });
            }
        }

        /// <summary>
        /// 升级地产
        /// </summary>
        private void UpgradeProperty(PlayerController player)
        {
            int upgradeCost = _property.UpgradeCost;

            if (player.SpendMoney(upgradeCost))
            {
                _property.Upgrade();
                UpdateVisuals();
                EventManager.Instance.TriggerEvent(GameEvents.PropertyUpgraded, _property);
                Debug.Log($"{player.PlayerName} 花费 ${upgradeCost} 升级了 {_tileName} 到等级 {_property.Level}");
            }

            EndTileAction();
        }

        /// <summary>
        /// 处理租金支付
        /// </summary>
        private void HandleRentPayment(PlayerController player)
        {
            if (_property.IsMortgaged)
            {
                Debug.Log($"{_tileName} 已抵押，无需支付租金");
                EndTileAction();
                return;
            }

            int rent = _property.CurrentRent;
            PlayerController owner = _property.Owner;

            Debug.Log($"{player.PlayerName} 需要向 {owner.PlayerName} 支付租金 ${rent}");

            if (player.CanAfford(rent))
            {
                player.PayTo(owner, rent);
                EventManager.Instance.TriggerEvent(GameEvents.RentPaid, new RentPaymentEventData
                {
                    Payer = player,
                    Receiver = owner,
                    Amount = rent,
                    Property = _property
                });
            }
            else
            {
                // 资金不足，需要抵押或破产
                HandleInsufficientFunds(player, rent, owner);
            }

            EndTileAction();
        }

        /// <summary>
        /// 处理资金不足情况
        /// </summary>
        private void HandleInsufficientFunds(PlayerController player, int amountOwed, PlayerController creditor)
        {
            int totalAssets = CalculateTotalAssets(player);

            if (totalAssets >= amountOwed)
            {
                // 需要抵押地产
                Debug.Log($"{player.PlayerName} 需要抵押地产来支付 ${amountOwed}");
                // TODO: 显示抵押UI或AI自动抵押
            }
            else
            {
                // 破产
                Debug.Log($"{player.PlayerName} 资不抵债，宣告破产!");
                // 将所有资产转给债权人
                TransferAllAssetsTo(player, creditor);
                player.DeclareBankruptcy();
            }
        }

        private int CalculateTotalAssets(PlayerController player)
        {
            int total = player.Money;
            foreach (var prop in player.OwnedProperties)
            {
                total += prop.MortgageValue;
            }
            return total;
        }

        private void TransferAllAssetsTo(PlayerController from, PlayerController to)
        {
            // 转移现金
            to.AddMoney(from.Money);

            // 转移地产
            foreach (var prop in from.OwnedProperties)
            {
                to.AcquireProperty(prop);
            }
        }

        /// <summary>
        /// 更新视觉效果
        /// </summary>
        private void UpdateVisuals()
        {
            // 更新所有者指示器颜色
            if (_ownerIndicator != null && _property.Owner != null)
            {
                _ownerIndicator.color = _property.Owner.Data.PlayerColor;
                _ownerIndicator.gameObject.SetActive(true);
            }
            else if (_ownerIndicator != null)
            {
                _ownerIndicator.gameObject.SetActive(false);
            }

            // 更新房屋指示器
            if (_houseIndicators != null)
            {
                for (int i = 0; i < _houseIndicators.Length; i++)
                {
                    if (_houseIndicators[i] != null)
                    {
                        _houseIndicators[i].gameObject.SetActive(i < _property.Level);
                    }
                }
            }
        }

        private void EndTileAction()
        {
            // 通知回合管理器格子事件处理完成
            FindObjectOfType<TurnManager>()?.EndTurn();
        }

        public override string GetDescription()
        {
            if (_property == null) return base.GetDescription();

            string desc = $"{_tileName}\n";
            desc += $"价格: ${_property.PurchasePrice}\n";
            desc += $"租金: ${_property.CurrentRent}\n";
            desc += $"等级: {_property.Level}/{Constants.MaxPropertyLevel}\n";

            if (_property.Owner != null)
            {
                desc += $"所有者: {_property.Owner.PlayerName}";
            }
            else
            {
                desc += "待售";
            }

            return desc;
        }
    }

    // 事件数据类
    public class PropertyPurchaseEventData
    {
        public Property Property;
        public PlayerController Player;
        public System.Action OnConfirm;
        public System.Action OnCancel;
    }

    public class PropertyUpgradeEventData
    {
        public Property Property;
        public PlayerController Player;
        public System.Action OnConfirm;
        public System.Action OnCancel;
    }

    public class RentPaymentEventData
    {
        public PlayerController Payer;
        public PlayerController Receiver;
        public int Amount;
        public Property Property;
    }
}
