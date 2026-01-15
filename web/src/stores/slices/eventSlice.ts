/**
 * Event Slice - 特殊事件、日志
 */

import {
  TileType,
  GameConstants,
  SpecialEvent,
  NewsEvents,
  LotteryEvents,
  ChanceEvents,
  FateEvents,
} from '@/types'
import { generateId } from '@/utils/helpers'
import type { EventSlice, SliceCreator } from './types'

export const createEventSlice: SliceCreator<EventSlice> = (set, get) => ({
  // Initial state
  gameLog: [],
  currentEvent: null,
  hasFreeUpgrade: false,

  // ============ Log Actions ============

  addLog: (message) => {
    set((state) => ({
      gameLog: [...state.gameLog.slice(-99), message],
    }))
  },

  // ============ Event State ============

  setCurrentEvent: (event) => {
    set({ currentEvent: event })
  },

  setHasFreeUpgrade: (value) => {
    set({ hasFreeUpgrade: value })
  },

  // ============ Special Events ============

  handleTileEvent: (playerId, tileIndex) => {
    const { getTile, getPlayer, addLog, setCurrentEvent, getActivePlayers, applyEventEffect } = get()
    const tile = getTile(tileIndex)
    const player = getPlayer(playerId)
    if (!tile || !player) return null

    let events: Omit<SpecialEvent, 'id'>[] = []

    switch (tile.type) {
      case TileType.News:
        events = NewsEvents
        break
      case TileType.Lottery:
        events = LotteryEvents
        break
      case TileType.Chance:
        events = ChanceEvents
        break
      case TileType.Fate:
        events = FateEvents
        break
      default:
        return null
    }

    // 随机选择一个事件
    const randomEvent = events[Math.floor(Math.random() * events.length)]
    const event: SpecialEvent = {
      ...randomEvent,
      id: generateId(),
    }

    addLog(`【${event.title}】${event.description}`)
    setCurrentEvent(event)

    // 新闻事件影响所有玩家
    if (tile.type === TileType.News) {
      getActivePlayers().forEach((p) => {
        applyEventEffect(p.id, event.effect)
      })
    } else {
      applyEventEffect(playerId, event.effect)
    }

    return event
  },

  applyEventEffect: (playerId, effect) => {
    const {
      getPlayer,
      addMoney,
      spendMoney,
      setBankrupt,
      teleportPlayer,
      sendToJail,
      sendToHospital,
      transferMoney,
      getActivePlayers,
      setHasFreeUpgrade,
      addLog,
      boardSize,
    } = get()

    const player = getPlayer(playerId)
    if (!player) return

    switch (effect.type) {
      case 'money':
        if (effect.amount > 0) {
          addMoney(playerId, effect.amount)
        } else if (effect.amount < 0) {
          const canPay = spendMoney(playerId, Math.abs(effect.amount))
          if (!canPay) {
            // 钱不够，破产
            setBankrupt(playerId)
          }
        }
        break

      case 'move':
        const newIndex = (player.currentTileIndex + effect.steps + boardSize) % boardSize
        teleportPlayer(playerId, newIndex)
        break

      case 'teleport':
        teleportPlayer(playerId, effect.tileIndex)
        // 如果传送到起点，给工资
        if (effect.tileIndex === 0) {
          addMoney(playerId, GameConstants.SalaryOnPassStart)
          addLog(`${player.name} 获得起点奖励 ${GameConstants.SalaryOnPassStart} 元`)
        }
        break

      case 'jail':
        sendToJail(playerId, effect.turns)
        break

      case 'hospital':
        sendToHospital(playerId, effect.turns)
        break

      case 'collectFromAll':
        const activePlayers = getActivePlayers()
        activePlayers.forEach((p) => {
          if (p.id !== playerId) {
            transferMoney(p.id, playerId, effect.amount)
          }
        })
        break

      case 'payToAll':
        const allPlayers = getActivePlayers()
        allPlayers.forEach((p) => {
          if (p.id !== playerId) {
            transferMoney(playerId, p.id, effect.amount)
          }
        })
        break

      case 'freeUpgrade':
        setHasFreeUpgrade(true)
        addLog(`${player.name} 获得一次免费升级机会`)
        break

      case 'skipTurn':
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, turnsToSkip: p.turnsToSkip + effect.turns } : p
          ),
        }))
        break
    }
  },
})
