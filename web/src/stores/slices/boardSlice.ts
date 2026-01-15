/**
 * Board Slice - 地图数据、地产操作、设施
 */

import { GameConstants, PropertyFacility } from '@/types'
import type { BoardSlice, SliceCreator } from './types'

export const createBoardSlice: SliceCreator<BoardSlice> = (set, get) => ({
  // Initial state
  tiles: [],
  boardSize: GameConstants.DefaultBoardSize,

  // ============ Property Actions ============

  purchaseProperty: (playerId, tileIndex) => {
    const { getTile, getPlayer, spendMoney, addLog } = get()
    const tile = getTile(tileIndex)
    const player = getPlayer(playerId)

    if (!tile?.propertyData || !player) return false
    if (tile.propertyData.ownerId !== null) return false

    const price =
      tile.propertyData.basePrice *
      GameConstants.RegionMultipliers[tile.propertyData.region]

    if (player.money < price) return false

    spendMoney(playerId, price)

    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.index === tileIndex
          ? {
              ...t,
              propertyData: { ...t.propertyData!, ownerId: playerId, level: 1 },
            }
          : t
      ),
      players: state.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              ownedPropertyIndices: [...p.ownedPropertyIndices, tileIndex],
              stats: {
                ...p.stats,
                totalTilesPurchased: p.stats.totalTilesPurchased + 1,
              },
            }
          : p
      ),
    }))

    addLog(`${player.name} 购买了 ${tile.name}，花费 ${price} 元`)
    return true
  },

  upgradeProperty: (tileIndex) => {
    const { getTile, getPlayer, spendMoney, addLog } = get()
    const tile = getTile(tileIndex)
    if (!tile?.propertyData) return false

    const { ownerId, level, basePrice } = tile.propertyData
    if (!ownerId || level >= GameConstants.MaxPropertyLevel) return false

    const player = getPlayer(ownerId)
    if (!player) return false

    const upgradeCost = basePrice * level * 0.5

    if (player.money < upgradeCost) return false

    spendMoney(ownerId, upgradeCost)

    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.index === tileIndex
          ? {
              ...t,
              propertyData: { ...t.propertyData!, level: level + 1 },
            }
          : t
      ),
    }))

    addLog(`${player.name} 升级了 ${tile.name} 到 ${level + 1} 级，花费 ${upgradeCost} 元`)
    return true
  },

  mortgageProperty: (tileIndex) => {
    const { getTile, getPlayer, addMoney, addLog } = get()
    const tile = getTile(tileIndex)
    if (!tile?.propertyData || tile.propertyData.isMortgaged) return 0

    const { ownerId, basePrice, level, region } = tile.propertyData
    if (!ownerId) return 0

    const totalValue =
      basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
    const mortgageValue = totalValue * GameConstants.MortgageRate

    addMoney(ownerId, mortgageValue)

    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.index === tileIndex
          ? {
              ...t,
              propertyData: { ...t.propertyData!, isMortgaged: true },
            }
          : t
      ),
    }))

    const player = getPlayer(ownerId)
    addLog(`${player?.name} 抵押了 ${tile.name}，获得 ${mortgageValue} 元`)

    return mortgageValue
  },

  redeemProperty: (tileIndex) => {
    const { getTile, getPlayer, spendMoney, addLog } = get()
    const tile = getTile(tileIndex)
    if (!tile?.propertyData || !tile.propertyData.isMortgaged) return false

    const { ownerId, basePrice, level, region } = tile.propertyData
    if (!ownerId) return false

    const player = getPlayer(ownerId)
    if (!player) return false

    const totalValue =
      basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
    const mortgageValue = totalValue * GameConstants.MortgageRate
    const redeemCost = mortgageValue * (1 + GameConstants.RedeemInterestRate)

    if (player.money < redeemCost) return false

    spendMoney(ownerId, redeemCost)

    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.index === tileIndex
          ? {
              ...t,
              propertyData: { ...t.propertyData!, isMortgaged: false },
            }
          : t
      ),
    }))

    addLog(`${player.name} 赎回了 ${tile.name}，花费 ${redeemCost} 元`)
    return true
  },

  calculateRent: (tileIndex) => {
    const tile = get().getTile(tileIndex)
    if (!tile?.propertyData) return 0

    const { baseRent, level, region, isMortgaged, facilityType, resortEnabled } =
      tile.propertyData
    if (isMortgaged || level === 0) return 0
    if (resortEnabled && facilityType !== PropertyFacility.None) return 0

    return (
      baseRent *
      GameConstants.RegionMultipliers[region] *
      GameConstants.RentMultipliers[level]
    )
  },

  setPropertyFacility: (tileIndex, facility) => {
    const { getTile, getPlayer, addLog } = get()
    const tile = getTile(tileIndex)
    if (!tile?.propertyData || !tile.propertyData.ownerId) return

    set((state) => ({
      tiles: state.tiles.map((t) =>
        t.index === tileIndex
          ? {
              ...t,
              propertyData: { ...t.propertyData!, facilityType: facility },
            }
          : t
      ),
    }))

    const owner = getPlayer(tile.propertyData.ownerId)
    const facilityName =
      facility === PropertyFacility.Park
        ? '公园'
        : facility === PropertyFacility.Hotel
          ? '酒店'
          : facility === PropertyFacility.Mall
            ? '购物广场'
            : '空地'
    addLog(`${owner?.name} 将 ${tile.name} 设置为 ${facilityName}`)
  },

  // ============ Rent Payment ============

  payRent: (playerId, tileIndex) => {
    const { getTile, getPlayer, calculateRent, transferMoney, setBankrupt, addLog } = get()
    const tile = getTile(tileIndex)
    const player = getPlayer(playerId)

    if (!tile?.propertyData || !player) return false

    const { ownerId, isMortgaged } = tile.propertyData

    // 检查是否是他人的地产且未抵押
    if (!ownerId || ownerId === playerId || isMortgaged) return false

    const owner = getPlayer(ownerId)
    if (!owner) return false

    const rent = calculateRent(tileIndex)
    if (rent <= 0) return false

    // 尝试支付租金
    if (player.money >= rent) {
      transferMoney(playerId, ownerId, rent)
      addLog(`${player.name} 向 ${owner.name} 支付租金 ${rent} 元 (${tile.name})`)

      // 更新统计
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id === playerId) {
            return { ...p, stats: { ...p.stats, totalRentPaid: p.stats.totalRentPaid + rent } }
          }
          if (p.id === ownerId) {
            return { ...p, stats: { ...p.stats, totalRentReceived: p.stats.totalRentReceived + rent } }
          }
          return p
        }),
      }))

      return true
    } else {
      // 钱不够支付租金
      const actualPaid = player.money
      if (actualPaid > 0) {
        transferMoney(playerId, ownerId, actualPaid)
        addLog(`${player.name} 无法支付全额租金，仅支付 ${actualPaid} 元`)
      }
      setBankrupt(playerId)
      return false
    }
  },

  payResortFee: (playerId, tileIndex, amount, stayTurns, facility) => {
    const { getTile, getPlayer, transferMoney, setBankrupt, addLog } = get()
    const tile = getTile(tileIndex)
    const player = getPlayer(playerId)
    if (!tile?.propertyData || !player) return false

    const { ownerId, isMortgaged } = tile.propertyData
    if (!ownerId || ownerId === playerId || isMortgaged) return false

    const owner = getPlayer(ownerId)
    if (!owner) return false

    if (amount <= 0) return false

    const facilityName =
      facility === PropertyFacility.Hotel ? '酒店' : facility === PropertyFacility.Mall ? '购物广场' : '公园'

    const applyStay = (turns: number) => {
      if (turns <= 0) return
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, turnsToSkip: p.turnsToSkip + turns } : p
        ),
      }))
    }

    if (player.money >= amount) {
      transferMoney(playerId, ownerId, amount)
      addLog(`${player.name} 在 ${tile.name}${facilityName} 支付 ${amount} 元`)
      if (stayTurns > 0) {
        applyStay(stayTurns)
        addLog(`${player.name} 需要入住 ${stayTurns} 回合`)
      }

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id === playerId) {
            return { ...p, stats: { ...p.stats, totalRentPaid: p.stats.totalRentPaid + amount } }
          }
          if (p.id === ownerId) {
            return {
              ...p,
              stats: { ...p.stats, totalRentReceived: p.stats.totalRentReceived + amount },
            }
          }
          return p
        }),
      }))

      return true
    }

    const actualPaid = player.money
    if (actualPaid > 0) {
      transferMoney(playerId, ownerId, actualPaid)
      addLog(`${player.name} 无法支付全额费用，仅支付 ${actualPaid} 元`)
    }
    setBankrupt(playerId)
    return false
  },

  // ============ Getters ============

  getTile: (index) => {
    return get().tiles.find((t) => t.index === index) || null
  },

  getProperty: (index) => {
    return get().getTile(index)?.propertyData || null
  },

  getPropertyOwner: (tileIndex) => {
    const { getTile, getPlayer } = get()
    const tile = getTile(tileIndex)
    if (!tile?.propertyData?.ownerId) return null
    return getPlayer(tile.propertyData.ownerId)
  },
})
