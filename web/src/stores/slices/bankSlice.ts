/**
 * Bank Slice - 贷款系统
 */

import { LoanData, GameConstants } from '@/types'
import { generateId } from '@/utils/helpers'
import type { BankSlice, SliceCreator } from './types'

export const createBankSlice: SliceCreator<BankSlice> = (set, get) => ({
  // Initial state
  loans: [],

  // ============ Bank Actions ============

  takeLoan: (playerId, amount) => {
    const { getPlayer, addMoney, addLog, loans } = get()
    const player = getPlayer(playerId)
    if (!player) return false

    const existingLoans = loans.filter((l) => l.playerId === playerId)
    if (existingLoans.length >= GameConstants.MaxLoansPerPlayer) return false
    if (amount > GameConstants.MaxLoanAmount) return false

    const loan: LoanData = {
      id: generateId(),
      playerId,
      amount,
      remainingTurns: GameConstants.LoanTerm,
      interestRate: GameConstants.LoanInterestRate,
    }

    addMoney(playerId, amount)

    set((state) => ({
      loans: [...state.loans, loan],
    }))

    addLog(`${player.name} 从银行贷款 ${amount} 元`)
    return true
  },

  processLoans: () => {
    const { getPlayer, spendMoney, setBankrupt, addLog } = get()

    set((state) => ({
      loans: state.loans
        .map((loan) => {
          const player = getPlayer(loan.playerId)
          if (!player) return null

          const newRemaining = loan.remainingTurns - 1

          // Loan is due
          if (newRemaining <= 0) {
            const totalDue = loan.amount * (1 + loan.interestRate)

            if (player.money >= totalDue) {
              spendMoney(loan.playerId, totalDue)
              addLog(`${player.name} 还清贷款 ${totalDue} 元`)
            } else {
              setBankrupt(loan.playerId)
            }
            return null
          }

          return { ...loan, remainingTurns: newRemaining }
        })
        .filter((l): l is LoanData => l !== null),
    }))
  },
})
