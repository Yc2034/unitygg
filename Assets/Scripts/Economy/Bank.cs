using System.Collections.Generic;
using UnityEngine;
using RichMan.Utils;
using RichMan.Player;

namespace RichMan.Economy
{
    /// <summary>
    /// 贷款数据
    /// </summary>
    [System.Serializable]
    public class Loan
    {
        public int Amount;          // 贷款金额
        public float InterestRate;  // 利率
        public int RemainingTurns;  // 剩余还款回合
        public int TurnBorrowed;    // 借款回合

        public int TotalOwed => Mathf.RoundToInt(Amount * (1 + InterestRate));
        public int PaymentPerTurn => Mathf.CeilToInt(TotalOwed / (float)RemainingTurns);
    }

    /// <summary>
    /// 银行系统 - 管理贷款、抵押等金融操作
    /// </summary>
    public class Bank : Singleton<Bank>
    {
        [Header("贷款设置")]
        [SerializeField] private int _maxLoanAmount = 20000;
        [SerializeField] private float _loanInterestRate = 0.1f; // 10%利息
        [SerializeField] private int _loanTermTurns = 10; // 还款期限（回合数）
        [SerializeField] private int _maxLoansPerPlayer = 3;

        [Header("存款设置")]
        [SerializeField] private float _savingsInterestRate = 0.05f; // 5%存款利息

        // 玩家贷款记录
        private Dictionary<PlayerController, List<Loan>> _playerLoans = new Dictionary<PlayerController, List<Loan>>();

        // 玩家存款记录
        private Dictionary<PlayerController, int> _playerSavings = new Dictionary<PlayerController, int>();

        #region 贷款

        /// <summary>
        /// 检查玩家是否可以贷款
        /// </summary>
        public bool CanBorrow(PlayerController player, int amount)
        {
            if (amount <= 0 || amount > _maxLoanAmount)
            {
                return false;
            }

            if (!_playerLoans.ContainsKey(player))
            {
                return true;
            }

            return _playerLoans[player].Count < _maxLoansPerPlayer;
        }

        /// <summary>
        /// 获取玩家可贷款的最大金额
        /// </summary>
        public int GetMaxBorrowAmount(PlayerController player)
        {
            // 基础额度
            int baseAmount = _maxLoanAmount;

            // 根据资产增加额度
            player.Data.CalculateTotalAssets(player.OwnedProperties);
            int assetBonus = Mathf.RoundToInt(player.Data.TotalAssets * 0.3f);

            return baseAmount + assetBonus;
        }

        /// <summary>
        /// 贷款
        /// </summary>
        public bool Borrow(PlayerController player, int amount)
        {
            if (!CanBorrow(player, amount))
            {
                Debug.Log($"{player.PlayerName} 无法贷款 ${amount}");
                return false;
            }

            // 创建贷款记录
            Loan loan = new Loan
            {
                Amount = amount,
                InterestRate = _loanInterestRate,
                RemainingTurns = _loanTermTurns,
                TurnBorrowed = Core.GameManager.Instance != null ?
                    FindObjectOfType<Core.TurnManager>()?.TurnNumber ?? 0 : 0
            };

            // 添加到记录
            if (!_playerLoans.ContainsKey(player))
            {
                _playerLoans[player] = new List<Loan>();
            }
            _playerLoans[player].Add(loan);

            // 发放贷款
            player.AddMoney(amount);

            Debug.Log($"{player.PlayerName} 贷款 ${amount}，需还款 ${loan.TotalOwed}，分 {_loanTermTurns} 回合还清");
            return true;
        }

        /// <summary>
        /// 还款（每回合自动扣除）
        /// </summary>
        public void ProcessLoanPayments(PlayerController player)
        {
            if (!_playerLoans.ContainsKey(player) || _playerLoans[player].Count == 0)
            {
                return;
            }

            List<Loan> completedLoans = new List<Loan>();

            foreach (var loan in _playerLoans[player])
            {
                int payment = loan.PaymentPerTurn;

                if (player.CanAfford(payment))
                {
                    player.SpendMoney(payment);
                    loan.RemainingTurns--;

                    Debug.Log($"{player.PlayerName} 还款 ${payment}，剩余 {loan.RemainingTurns} 期");

                    if (loan.RemainingTurns <= 0)
                    {
                        completedLoans.Add(loan);
                    }
                }
                else
                {
                    // 无法还款，可能触发破产
                    Debug.LogWarning($"{player.PlayerName} 无法偿还贷款！");
                    // TODO: 处理逾期
                }
            }

            // 移除已还清的贷款
            foreach (var loan in completedLoans)
            {
                _playerLoans[player].Remove(loan);
                Debug.Log($"{player.PlayerName} 还清一笔贷款");
            }
        }

        /// <summary>
        /// 提前还清贷款
        /// </summary>
        public bool RepayLoanEarly(PlayerController player, int loanIndex)
        {
            if (!_playerLoans.ContainsKey(player) ||
                loanIndex < 0 || loanIndex >= _playerLoans[player].Count)
            {
                return false;
            }

            Loan loan = _playerLoans[player][loanIndex];
            int remainingAmount = loan.PaymentPerTurn * loan.RemainingTurns;

            if (player.SpendMoney(remainingAmount))
            {
                _playerLoans[player].RemoveAt(loanIndex);
                Debug.Log($"{player.PlayerName} 提前还清贷款 ${remainingAmount}");
                return true;
            }

            return false;
        }

        /// <summary>
        /// 获取玩家的总负债
        /// </summary>
        public int GetTotalDebt(PlayerController player)
        {
            if (!_playerLoans.ContainsKey(player))
            {
                return 0;
            }

            int total = 0;
            foreach (var loan in _playerLoans[player])
            {
                total += loan.PaymentPerTurn * loan.RemainingTurns;
            }
            return total;
        }

        /// <summary>
        /// 获取玩家的所有贷款
        /// </summary>
        public List<Loan> GetPlayerLoans(PlayerController player)
        {
            if (!_playerLoans.ContainsKey(player))
            {
                return new List<Loan>();
            }
            return new List<Loan>(_playerLoans[player]);
        }

        #endregion

        #region 存款

        /// <summary>
        /// 存款
        /// </summary>
        public bool Deposit(PlayerController player, int amount)
        {
            if (amount <= 0 || !player.CanAfford(amount))
            {
                return false;
            }

            player.SpendMoney(amount);

            if (!_playerSavings.ContainsKey(player))
            {
                _playerSavings[player] = 0;
            }
            _playerSavings[player] += amount;

            Debug.Log($"{player.PlayerName} 存入 ${amount}");
            return true;
        }

        /// <summary>
        /// 取款
        /// </summary>
        public bool Withdraw(PlayerController player, int amount)
        {
            if (!_playerSavings.ContainsKey(player) ||
                _playerSavings[player] < amount)
            {
                return false;
            }

            _playerSavings[player] -= amount;
            player.AddMoney(amount);

            Debug.Log($"{player.PlayerName} 取出 ${amount}");
            return true;
        }

        /// <summary>
        /// 取出全部存款
        /// </summary>
        public int WithdrawAll(PlayerController player)
        {
            if (!_playerSavings.ContainsKey(player))
            {
                return 0;
            }

            int amount = _playerSavings[player];
            _playerSavings[player] = 0;
            player.AddMoney(amount);

            Debug.Log($"{player.PlayerName} 取出全部存款 ${amount}");
            return amount;
        }

        /// <summary>
        /// 获取玩家存款余额
        /// </summary>
        public int GetSavingsBalance(PlayerController player)
        {
            if (!_playerSavings.ContainsKey(player))
            {
                return 0;
            }
            return _playerSavings[player];
        }

        /// <summary>
        /// 计算并发放存款利息（每轮结束时调用）
        /// </summary>
        public void PaySavingsInterest()
        {
            foreach (var kvp in _playerSavings)
            {
                if (kvp.Value > 0)
                {
                    int interest = Mathf.RoundToInt(kvp.Value * _savingsInterestRate);
                    if (interest > 0)
                    {
                        _playerSavings[kvp.Key] += interest;
                        Debug.Log($"{kvp.Key.PlayerName} 获得存款利息 ${interest}");
                    }
                }
            }
        }

        #endregion

        #region 抵押管理

        /// <summary>
        /// 抵押地产到银行
        /// </summary>
        public bool MortgageProperty(PlayerController player, Property property)
        {
            if (property == null || !property.IsOwnedBy(player) || property.IsMortgaged)
            {
                return false;
            }

            return property.Mortgage();
        }

        /// <summary>
        /// 从银行赎回地产
        /// </summary>
        public bool RedeemProperty(PlayerController player, Property property)
        {
            if (property == null || !property.IsOwnedBy(player) || !property.IsMortgaged)
            {
                return false;
            }

            return property.Redeem();
        }

        #endregion
    }
}
