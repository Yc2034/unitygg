using UnityEngine;
using RichMan.Utils;
using RichMan.Player;
using RichMan.Core;

namespace RichMan.Board
{
    /// <summary>
    /// 起点格子
    /// </summary>
    public class StartTile : Tile
    {
        [SerializeField] private int _bonusMoney = 2000;

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Start;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达起点");
            // 到达起点的奖励已在经过时发放，这里可以额外奖励
            // player.AddMoney(_bonusMoney);
            FindObjectOfType<TurnManager>()?.EndTurn();
        }

        public override void OnPlayerPass(PlayerController player)
        {
            // 经过起点时在PlayerController中处理
        }
    }

    /// <summary>
    /// 银行格子
    /// </summary>
    public class BankTile : Tile
    {
        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Bank;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达银行");

            if (player.IsAI)
            {
                // AI自动处理银行业务
                HandleAIBankBusiness(player);
            }
            else
            {
                // 显示银行UI
                EventManager.Instance.TriggerEvent("ShowBankUI", player);
            }
        }

        private void HandleAIBankBusiness(PlayerController player)
        {
            // AI可以在这里处理贷款或赎回抵押
            FindObjectOfType<TurnManager>()?.EndTurn();
        }
    }

    /// <summary>
    /// 商店格子
    /// </summary>
    public class ShopTile : Tile
    {
        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Shop;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达商店");

            if (player.IsAI)
            {
                // AI自动购买道具
                HandleAIShopBusiness(player);
            }
            else
            {
                // 显示商店UI
                EventManager.Instance.TriggerEvent("ShowShopUI", player);
            }
        }

        private void HandleAIShopBusiness(PlayerController player)
        {
            // TODO: AI购买道具逻辑
            FindObjectOfType<TurnManager>()?.EndTurn();
        }
    }

    /// <summary>
    /// 新闻站格子
    /// </summary>
    public class NewsTile : Tile
    {
        [SerializeField] private string[] _newsMessages = new string[]
        {
            "股市大涨！所有玩家获得$1000",
            "经济危机！所有玩家损失$500",
            "税收改革！地产税增加10%",
            "房市繁荣！所有地产价值上涨",
            "天灾来袭！随机一处地产受损"
        };

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.News;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达新闻站");

            // 随机选择一条新闻
            int index = Random.Range(0, _newsMessages.Length);
            string news = _newsMessages[index];

            Debug.Log($"新闻: {news}");
            ApplyNewsEffect(index);

            FindObjectOfType<TurnManager>()?.EndTurn();
        }

        private void ApplyNewsEffect(int newsIndex)
        {
            // TODO: 根据新闻类型应用效果
            switch (newsIndex)
            {
                case 0: // 所有玩家获得金钱
                    foreach (var player in GameManager.Instance.Players)
                    {
                        player.AddMoney(1000);
                    }
                    break;
                case 1: // 所有玩家损失金钱
                    foreach (var player in GameManager.Instance.Players)
                    {
                        player.SpendMoney(500);
                    }
                    break;
                // 更多效果...
            }
        }
    }

    /// <summary>
    /// 彩票站格子
    /// </summary>
    public class LotteryTile : Tile
    {
        [SerializeField] private int _ticketPrice = 200;
        [SerializeField] private int[] _prizes = new int[] { 0, 100, 500, 1000, 5000, 10000 };
        [SerializeField] private float[] _prizeChances = new float[] { 0.5f, 0.25f, 0.15f, 0.07f, 0.025f, 0.005f };

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Lottery;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达彩票站");

            if (player.IsAI)
            {
                // AI随机决定是否买彩票
                if (Random.value > 0.5f && player.CanAfford(_ticketPrice))
                {
                    BuyTicket(player);
                }
                FindObjectOfType<TurnManager>()?.EndTurn();
            }
            else
            {
                // 显示彩票UI
                EventManager.Instance.TriggerEvent("ShowLotteryUI", new LotteryEventData
                {
                    Player = player,
                    TicketPrice = _ticketPrice,
                    OnBuy = () => BuyTicket(player),
                    OnSkip = () => FindObjectOfType<TurnManager>()?.EndTurn()
                });
            }
        }

        private void BuyTicket(PlayerController player)
        {
            if (!player.SpendMoney(_ticketPrice))
            {
                Debug.Log($"{player.PlayerName} 资金不足，无法购买彩票");
                return;
            }

            // 抽奖
            int prize = DrawPrize();
            if (prize > 0)
            {
                player.AddMoney(prize);
                Debug.Log($"{player.PlayerName} 中奖了！获得 ${prize}");
            }
            else
            {
                Debug.Log($"{player.PlayerName} 没有中奖");
            }
        }

        private int DrawPrize()
        {
            float random = Random.value;
            float cumulative = 0f;

            for (int i = 0; i < _prizeChances.Length; i++)
            {
                cumulative += _prizeChances[i];
                if (random <= cumulative)
                {
                    return _prizes[i];
                }
            }

            return 0;
        }
    }

    /// <summary>
    /// 医院格子
    /// </summary>
    public class HospitalTile : Tile
    {
        [SerializeField] private int _treatmentCost = 500;

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Hospital;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达医院");

            if (player.State == PlayerState.InHospital)
            {
                // 正在住院
                Debug.Log($"{player.PlayerName} 正在住院中...");
            }
            else
            {
                // 正常到达，可以选择治疗恢复状态
            }

            FindObjectOfType<TurnManager>()?.EndTurn();
        }
    }

    /// <summary>
    /// 监狱格子
    /// </summary>
    public class PrisonTile : Tile
    {
        [SerializeField] private int _bailAmount = 1000;

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Prison;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 到达监狱");

            if (player.State == PlayerState.InJail)
            {
                // 正在坐牢
                Debug.Log($"{player.PlayerName} 正在服刑中，剩余 {player.TurnsToSkip} 回合");

                // 可以选择交保释金提前出狱
                if (player.IsAI)
                {
                    // AI决定是否交保释金
                    if (player.CanAfford(_bailAmount) && player.TurnsToSkip > 1)
                    {
                        PayBail(player);
                    }
                }
                else
                {
                    // 显示保释UI
                    EventManager.Instance.TriggerEvent("ShowBailUI", new BailEventData
                    {
                        Player = player,
                        BailAmount = _bailAmount,
                        OnPayBail = () => PayBail(player),
                        OnStay = () => { }
                    });
                }
            }
            else
            {
                // 只是路过监狱，探监
                Debug.Log($"{player.PlayerName} 探望监狱");
            }

            FindObjectOfType<TurnManager>()?.EndTurn();
        }

        private void PayBail(PlayerController player)
        {
            if (player.SpendMoney(_bailAmount))
            {
                player.SetState(PlayerState.Normal);
                player.Data.TurnsToSkip = 0;
                Debug.Log($"{player.PlayerName} 支付保释金 ${_bailAmount}，重获自由！");
            }
        }
    }

    /// <summary>
    /// 公园格子（免费停车）
    /// </summary>
    public class ParkTile : Tile
    {
        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Park;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            Debug.Log($"{player.PlayerName} 在公园休息");
            // 公园是安全地带，什么都不发生
            FindObjectOfType<TurnManager>()?.EndTurn();
        }
    }

    /// <summary>
    /// 缴税格子
    /// </summary>
    public class TaxTile : Tile
    {
        [SerializeField] private int _fixedTax = 500;
        [SerializeField] private float _percentageTax = 0.1f; // 10%总资产
        [SerializeField] private bool _usePercentage = false;

        protected override void Awake()
        {
            base.Awake();
            _tileType = TileType.Tax;
        }

        public override void OnPlayerLand(PlayerController player)
        {
            int taxAmount;

            if (_usePercentage)
            {
                // 计算总资产的百分比
                player.Data.CalculateTotalAssets(player.OwnedProperties);
                taxAmount = Mathf.RoundToInt(player.Data.TotalAssets * _percentageTax);
            }
            else
            {
                taxAmount = _fixedTax;
            }

            Debug.Log($"{player.PlayerName} 需要缴税 ${taxAmount}");

            if (player.SpendMoney(taxAmount))
            {
                Debug.Log($"{player.PlayerName} 缴纳税款 ${taxAmount}");
            }
            else
            {
                // 资金不足，可能需要抵押或破产
                Debug.Log($"{player.PlayerName} 资金不足，无法缴税！");
                // TODO: 处理资金不足情况
            }

            FindObjectOfType<TurnManager>()?.EndTurn();
        }
    }

    // 事件数据类
    public class LotteryEventData
    {
        public PlayerController Player;
        public int TicketPrice;
        public System.Action OnBuy;
        public System.Action OnSkip;
    }

    public class BailEventData
    {
        public PlayerController Player;
        public int BailAmount;
        public System.Action OnPayBail;
        public System.Action OnStay;
    }
}
