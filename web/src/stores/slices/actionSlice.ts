/**
 * Action Slice - 指令队列管理
 * 将游戏逻辑与渲染动画解耦
 */

import { TileType, GameConstants, PlayerState, PropertyFacility, TurnState } from '@/types'
import type { PendingMove } from '@/types'
import type { ActionSlice, SliceCreator } from './types'

type MoveBuildResult = {
  path: number[]
  passedStart: boolean
  pendingMove: Omit<PendingMove, 'playerId'> | null
}

const getMoveOptions = (
  connections: Record<number, number[]>,
  currentIndex: number,
  previousIndex: number | null
) => {
  const options = connections[currentIndex] ?? []
  if (options.length <= 1) return options
  if (previousIndex === null || previousIndex === undefined) return options
  const forwardOptions = options.filter((index) => index !== previousIndex)
  return forwardOptions.length > 0 ? forwardOptions : options
}

const buildMovePath = (
  connections: Record<number, number[]>,
  startIndex: number,
  steps: number,
  previousIndex: number | null,
  options: {
    forcedNextIndex?: number | null
    allowChoice: boolean
    hasPassedStart: boolean
  }
): MoveBuildResult => {
  const path: number[] = []
  let remainingSteps = steps
  let currentIndex = startIndex
  let currentPrevious = previousIndex
  let passedStart = false
  let forcedNextIndex = options.forcedNextIndex ?? null
  let forcedUsed = false

  while (remainingSteps > 0) {
    const nextOptions = getMoveOptions(connections, currentIndex, currentPrevious)
    if (nextOptions.length === 0) {
      break
    }

    if (nextOptions.length > 1 && options.allowChoice && forcedNextIndex === null) {
      return {
        path,
        passedStart,
        pendingMove: {
          currentIndex,
          previousIndex: currentPrevious,
          remainingSteps,
          options: nextOptions,
          hasPassedStart: options.hasPassedStart || passedStart,
        },
      }
    }

    let nextIndex: number
    if (!forcedUsed && forcedNextIndex !== null) {
      nextIndex = nextOptions.includes(forcedNextIndex) ? forcedNextIndex : nextOptions[0]
      forcedUsed = true
      forcedNextIndex = null
    } else {
      nextIndex = nextOptions[0]
    }

    path.push(nextIndex)
    if (nextIndex === 0 && !options.hasPassedStart && !passedStart) {
      passedStart = true
    }

    remainingSteps -= 1
    currentPrevious = currentIndex
    currentIndex = nextIndex
  }

  return {
    path,
    passedStart,
    pendingMove: null,
  }
}

export const createActionSlice: SliceCreator<ActionSlice> = (set, get) => ({
  // Initial state
  actionQueue: [],
  currentAction: null,
  isProcessing: false,
  pendingMove: null,

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
      pendingMove: null,
    })
  },

  // ============ Apply Action (State Update) ============

  applyAction: (action) => {
    const { addLog } = get()

    switch (action.type) {
      case 'MOVE': {
        const { playerId, path, passedStart } = action
        const finalIndex = path[path.length - 1]
        const player = get().getPlayer(playerId)
        const startIndex = player?.currentTileIndex ?? finalIndex
        const lastTileIndex = path.length > 1 ? path[path.length - 2] : startIndex

        // 更新玩家位置
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p
            return {
              ...p,
              currentTileIndex: finalIndex,
              lastTileIndex,
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
            p.id === playerId ? { ...p, currentTileIndex: toIndex, lastTileIndex: null } : p
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
                  lastTileIndex: null,
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
                  lastTileIndex: null,
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
    const { tileConnections, getPlayer } = get()
    const player = getPlayer(playerId)
    const directionTarget = steps < 0 ? player?.lastTileIndex ?? null : null
    const { path, passedStart } = buildMovePath(
      tileConnections,
      startIndex,
      Math.abs(steps),
      player?.lastTileIndex ?? null,
      { allowChoice: false, hasPassedStart: false, forcedNextIndex: directionTarget }
    )

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

  startMove: (playerId, steps) => {
    const { getPlayer, tileConnections, pushAction, setTurnState } = get()
    const player = getPlayer(playerId)
    if (!player) return
    set({ pendingMove: null })

    const { path, passedStart, pendingMove } = buildMovePath(
      tileConnections,
      player.currentTileIndex,
      steps,
      player.lastTileIndex ?? null,
      { allowChoice: true, hasPassedStart: false }
    )

    if (path.length > 0) {
      pushAction({
        type: 'MOVE' as const,
        playerId,
        path,
        passedStart,
      })
    }

    if (pendingMove) {
      set({ pendingMove: { ...pendingMove, playerId } })
      if (path.length === 0) {
        setTurnState(TurnState.ChoosingDirection)
      }
    }
  },

  chooseMoveDirection: (nextIndex) => {
    const { pendingMove, tileConnections, pushAction, setTurnState } = get()
    if (!pendingMove) return

    const { path, passedStart, pendingMove: nextPendingMove } = buildMovePath(
      tileConnections,
      pendingMove.currentIndex,
      pendingMove.remainingSteps,
      pendingMove.previousIndex,
      {
        forcedNextIndex: nextIndex,
        allowChoice: true,
        hasPassedStart: pendingMove.hasPassedStart,
      }
    )

    set({ pendingMove: null })

    if (path.length > 0) {
      pushAction({
        type: 'MOVE' as const,
        playerId: pendingMove.playerId,
        path,
        passedStart,
      })
    }

    if (nextPendingMove) {
      set({ pendingMove: { ...nextPendingMove, playerId: pendingMove.playerId } })
      if (path.length === 0) {
        setTurnState(TurnState.ChoosingDirection)
      }
    }
  },

  clearPendingMove: () => {
    set({ pendingMove: null })
  },

  createBankruptAction: (playerId) => {
    return {
      type: 'BANKRUPT' as const,
      playerId,
    }
  },
})
