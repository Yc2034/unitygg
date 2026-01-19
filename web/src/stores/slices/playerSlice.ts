/**
 * Player Slice - 玩家数据、移动、资金操作
 */

import {
  PlayerState,
  TileType,
  PropertyFacility,
  TileData,
} from '@/types'
import { GameConstants } from '@/constants/maps'
import type { PlayerSlice, SliceCreator } from './types'

// Helper to calculate total property value for a player
function calculatePlayerPropertyValue(playerId: string, tiles: TileData[]): number {
  return tiles
    .filter((t) => t.propertyData?.ownerId === playerId)
    .reduce((sum, t) => {
      if (!t.propertyData) return sum
      const { basePrice, level, region } = t.propertyData
      return sum + basePrice * GameConstants.RegionMultipliers[region] * (1 + level * 0.5)
    }, 0)
}

export const createPlayerSlice: SliceCreator<PlayerSlice> = (set, get) => ({
  // Initial state
  players: [],
  currentPlayerIndex: 0,

  // ============ Player Actions ============

  movePlayer: (playerId, steps) => {
    const { boardSize, addLog } = get()

    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p

        const oldIndex = p.currentTileIndex
        const newIndex = (oldIndex + steps) % boardSize

        // Check if passed start
        const passedStart = oldIndex + steps >= boardSize
        if (passedStart) {
          addLog(`${p.name} 经过起点，获得 ${GameConstants.SalaryOnPassStart} 元`)
        }

        return {
          ...p,
          currentTileIndex: newIndex,
          lastTileIndex: oldIndex,
          money: passedStart ? p.money + GameConstants.SalaryOnPassStart : p.money,
          stats: passedStart
            ? { ...p.stats, timesPassedStart: p.stats.timesPassedStart + 1 }
            : p.stats,
        }
      }),
    }))
  },

  teleportPlayer: (playerId, tileIndex) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, currentTileIndex: tileIndex, lastTileIndex: null } : p
      ),
    }))
  },

  addMoney: (playerId, amount) => {
    const { tiles } = get()
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p
        const newMoney = p.money + amount
        return {
          ...p,
          money: newMoney,
          totalAssets: newMoney + calculatePlayerPropertyValue(p.id, tiles),
        }
      }),
    }))
  },

  spendMoney: (playerId, amount) => {
    const player = get().getPlayer(playerId)
    if (!player || player.money < amount) return false

    const { tiles } = get()
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p
        const newMoney = p.money - amount
        return {
          ...p,
          money: newMoney,
          totalAssets: newMoney + calculatePlayerPropertyValue(p.id, tiles),
        }
      }),
    }))
    return true
  },

  transferMoney: (fromId, toId, amount) => {
    const from = get().getPlayer(fromId)
    if (!from || from.money < amount) return false

    get().spendMoney(fromId, amount)
    get().addMoney(toId, amount)
    return true
  },

  sendToJail: (playerId, turns = GameConstants.JailTurns) => {
    const { tiles, getPlayer, addLog } = get()
    const jailTile = tiles.find((t) => t.type === TileType.Prison)
    if (!jailTile) return

    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
            ...p,
            state: PlayerState.InJail,
            turnsToSkip: turns,
            currentTileIndex: jailTile.index,
          }
          : p
      ),
    }))

    const player = getPlayer(playerId)
    addLog(`${player?.name} 被送入监狱，需要等待 ${turns} 回合`)
  },

  sendToHospital: (playerId, turns = GameConstants.HospitalTurns) => {
    const { tiles, getPlayer, addLog } = get()
    const hospitalTile = tiles.find((t) => t.type === TileType.Hospital)
    if (!hospitalTile) return

    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
            ...p,
            state: PlayerState.InHospital,
            turnsToSkip: turns,
            currentTileIndex: hospitalTile.index,
          }
          : p
      ),
    }))

    const player = getPlayer(playerId)
    addLog(`${player?.name} 被送入医院，需要休息 ${turns} 回合`)
  },

  setBankrupt: (playerId) => {
    const { getPlayer, addLog } = get()

    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? {
            ...p,
            state: PlayerState.Bankrupt,
            money: 0,
          }
          : p
      ),
      // Clear all properties owned by bankrupt player
      tiles: state.tiles.map((t) =>
        t.propertyData?.ownerId === playerId
          ? {
            ...t,
            propertyData: {
              ...t.propertyData,
              ownerId: null,
              level: 0,
              facilityType: PropertyFacility.None,
            },
          }
          : t
      ),
    }))

    const player = getPlayer(playerId)
    addLog(`${player?.name} 破产了!`)
  },

  decrementSkipTurns: (playerId) => {
    set((state) => ({
      players: state.players.map((p) => {
        if (p.id !== playerId) return p
        const newTurns = Math.max(0, p.turnsToSkip - 1)
        return {
          ...p,
          turnsToSkip: newTurns,
          state: newTurns === 0 ? PlayerState.Normal : p.state,
        }
      }),
    }))
  },

  // ============ Getters ============

  getCurrentPlayer: () => {
    const { players, currentPlayerIndex } = get()
    return players[currentPlayerIndex] || null
  },

  getPlayer: (id) => {
    return get().players.find((p) => p.id === id) || null
  },

  getActivePlayers: () => {
    return get().players.filter((p) => p.state !== PlayerState.Bankrupt)
  },
})
