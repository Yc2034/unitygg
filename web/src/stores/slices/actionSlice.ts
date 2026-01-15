/**
 * Action Slice - 指令队列管理
 * 将游戏逻辑与渲染动画解耦
 */

import { TileType, GameConstants, PlayerState, PropertyFacility } from '@/types'
import type { ActionSlice, SliceCreator } from './types'

export const createActionSlice: SliceCreator<ActionSlice> = (set, get) => ({
  // Initial state
  actionQueue: [],
  currentAction: null,
  isProcessing: false,

  // ============ Queue Management ============

  pushAction: (action) => {
    const { currentAction, isProcessing } = get()

    if (!currentAction && !isProcessing) {
      // 队列为空，直接开始执行
      set({ currentAction: action, isProcessing: true })
    } else {
      // 加入队列等待
      set((state) => ({
        actionQueue: [...state.actionQueue, action],
      }))
    }
  },

  pushActions: (actions) => {
    if (actions.length === 0) return

    const { currentAction, isProcessing } = get()

    if (!currentAction && !isProcessing) {
      // 队列为空，第一个直接执行，其余加入队列
      const [first, ...rest] = actions
      set({
        currentAction: first,
        isProcessing: true,
        actionQueue: rest,
      })
    } else {
      // 全部加入队列
      set((state) => ({
        actionQueue: [...state.actionQueue, ...actions],
      }))
    }
  },

  completeAction: () => {
    const { currentAction, actionQueue, applyAction } = get()

    if (currentAction) {
      // 执行状态更新
      applyAction(currentAction)
    }

    // 取下一个 Action
    if (actionQueue.length > 0) {
      const [next, ...rest] = actionQueue
      set({ currentAction: next, actionQueue: rest })
    } else {
      set({ currentAction: null, isProcessing: false })
    }
  },

  clearActions: () => {
    set({
      actionQueue: [],
      currentAction: null,
      isProcessing: false,
    })
  },

  // ============ Apply Action (State Update) ============

  applyAction: (action) => {
    const { addLog } = get()

    switch (action.type) {
      case 'MOVE': {
        const { playerId, path, passedStart } = action
        const finalIndex = path[path.length - 1]

        // 更新玩家位置
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p
            return {
              ...p,
              currentTileIndex: finalIndex,
              money: passedStart ? p.money + GameConstants.SalaryOnPassStart : p.money,
              stats: passedStart
                ? { ...p.stats, timesPassedStart: p.stats.timesPassedStart + 1 }
                : p.stats,
            }
          }),
        }))

        if (passedStart) {
          const player = get().getPlayer(playerId)
          addLog(`${player?.name} 经过起点，获得 ${GameConstants.SalaryOnPassStart} 元`)
        }
        break
      }

      case 'TELEPORT': {
        const { playerId, toIndex } = action

        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, currentTileIndex: toIndex } : p
          ),
        }))
        break
      }

      case 'TO_JAIL': {
        const { playerId, jailIndex, turns } = action

        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  state: PlayerState.InJail,
                  turnsToSkip: turns,
                  currentTileIndex: jailIndex,
                }
              : p
          ),
        }))

        const player = get().getPlayer(playerId)
        addLog(`${player?.name} 被送入监狱，需要等待 ${turns} 回合`)
        break
      }

      case 'TO_HOSPITAL': {
        const { playerId, hospitalIndex, turns } = action

        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  state: PlayerState.InHospital,
                  turnsToSkip: turns,
                  currentTileIndex: hospitalIndex,
                }
              : p
          ),
        }))

        const player = get().getPlayer(playerId)
        addLog(`${player?.name} 被送入医院，需要休息 ${turns} 回合`)
        break
      }

      case 'BANKRUPT': {
        const { playerId } = action

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

        const player = get().getPlayer(playerId)
        addLog(`${player?.name} 破产了!`)
        break
      }
    }
  },

  // ============ Action Creators ============

  createMoveAction: (playerId, startIndex, steps) => {
    const { boardSize } = get()

    // 计算路径
    const path: number[] = []
    let passedStart = false

    for (let i = 1; i <= steps; i++) {
      const nextIndex = (startIndex + i) % boardSize
      path.push(nextIndex)

      // 检查是否经过起点
      if (startIndex + i >= boardSize && !passedStart) {
        passedStart = true
      }
    }

    return {
      type: 'MOVE' as const,
      playerId,
      path,
      passedStart,
    }
  },

  createTeleportAction: (playerId, toIndex) => {
    const player = get().getPlayer(playerId)
    const fromIndex = player?.currentTileIndex ?? 0

    return {
      type: 'TELEPORT' as const,
      playerId,
      fromIndex,
      toIndex,
    }
  },

  createToJailAction: (playerId, turns = GameConstants.JailTurns) => {
    const { tiles } = get()
    const jailTile = tiles.find((t) => t.type === TileType.Prison)
    const jailIndex = jailTile?.index ?? 0

    return {
      type: 'TO_JAIL' as const,
      playerId,
      jailIndex,
      turns,
    }
  },

  createToHospitalAction: (playerId, turns = GameConstants.HospitalTurns) => {
    const { tiles } = get()
    const hospitalTile = tiles.find((t) => t.type === TileType.Hospital)
    const hospitalIndex = hospitalTile?.index ?? 0

    return {
      type: 'TO_HOSPITAL' as const,
      playerId,
      hospitalIndex,
      turns,
    }
  },

  createBankruptAction: (playerId) => {
    return {
      type: 'BANKRUPT' as const,
      playerId,
    }
  },
})
