/**
 * 大富翁4 - Main Game Store
 * Zustand state management using Slice Pattern
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Import slice creators
import { createPlayerSlice } from './slices/playerSlice'
import { createBoardSlice } from './slices/boardSlice'
import { createGameFlowSlice } from './slices/gameFlowSlice'
import { createCardSlice } from './slices/cardSlice'
import { createBankSlice } from './slices/bankSlice'
import { createEventSlice } from './slices/eventSlice'

// Re-export types for external use
export type { GameStore, PlayerConfig } from './slices/types'

// Import types for the store type
import type { GameStore } from './slices/types'

// ============ Store Implementation ============

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((...a) => ({
    ...createPlayerSlice(...a),
    ...createBoardSlice(...a),
    ...createGameFlowSlice(...a),
    ...createCardSlice(...a),
    ...createBankSlice(...a),
    ...createEventSlice(...a),
  }))
)
