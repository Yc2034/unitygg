/**
 * Card Slice - 卡牌系统、商店
 */

import { CardData, CardType, GameConstants, PlayerState, DefaultCards } from '@/types'
import { generateId } from '@/utils/helpers'
import type { CardSlice, SliceCreator } from './types'

function createRandomCard(): CardData {
  const template = DefaultCards[Math.floor(Math.random() * DefaultCards.length)]
  return {
    ...template,
    id: generateId(),
  }
}

export const createCardSlice: SliceCreator<CardSlice> = (set, get) => ({
  // Initial state
  shopCards: [],

  // ============ Card Actions ============

  addCard: (playerId, card) => {
    const player = get().getPlayer(playerId)
    if (!player || player.cards.length >= GameConstants.MaxCardsInHand) return false

    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, cards: [...p.cards, card] } : p
      ),
    }))
    return true
  },

  removeCard: (playerId, cardId) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId
          ? { ...p, cards: p.cards.filter((c) => c.id !== cardId) }
          : p
      ),
    }))
  },

  useCard: (playerId, cardId, targetId) => {
    const {
      getPlayer,
      getActivePlayers,
      transferMoney,
      teleportPlayer,
      setForcedDiceValue,
      removeCard,
      addLog,
      tiles,
    } = get()

    const player = getPlayer(playerId)
    const card = player?.cards.find((c) => c.id === cardId)
    if (!player || !card) return false

    // Execute card effect based on type
    let success = false

    switch (card.type) {
      case CardType.Rob:
        if (targetId) {
          const target = getPlayer(targetId)
          if (target) {
            const amount = Math.min(target.money, 5000)
            transferMoney(targetId, playerId, amount)
            addLog(`${player.name} 使用抢劫卡，从 ${target.name} 抢走 ${amount} 元`)
            success = true
          }
        }
        break

      case CardType.Tax:
        const activePlayers = getActivePlayers()
        const totalMoney = activePlayers.reduce((sum, p) => sum + p.money, 0)
        const equalShare = Math.floor(totalMoney / activePlayers.length)

        set((state) => ({
          players: state.players.map((p) =>
            p.state !== PlayerState.Bankrupt ? { ...p, money: equalShare } : p
          ),
        }))

        addLog(`${player.name} 使用均贫卡，所有玩家现金平均分配为 ${equalShare} 元`)
        success = true
        break

      case CardType.Teleport:
        teleportPlayer(playerId, 0) // Teleport to start by default
        addLog(`${player.name} 使用传送卡`)
        success = true
        break

      case CardType.ControlDice:
        setForcedDiceValue(6) // Force max value
        addLog(`${player.name} 使用遥控骰子`)
        success = true
        break

      case CardType.Sleep:
        if (targetId) {
          const target = getPlayer(targetId)
          if (target) {
            set((state) => ({
              players: state.players.map((p) =>
                p.id === targetId ? { ...p, turnsToSkip: p.turnsToSkip + 2 } : p
              ),
            }))
            addLog(`${player.name} 对 ${target.name} 使用催眠卡`)
            success = true
          }
        }
        break

      case CardType.Demolish:
        if (targetId) {
          const target = getPlayer(targetId)
          if (target) {
            // Find highest level property
            const targetProperties = tiles
              .filter(
                (t) => t.propertyData?.ownerId === targetId && t.propertyData.level > 0
              )
              .sort((a, b) => (b.propertyData?.level || 0) - (a.propertyData?.level || 0))

            if (targetProperties.length > 0) {
              const prop = targetProperties[0]
              set((state) => ({
                tiles: state.tiles.map((t) =>
                  t.index === prop.index
                    ? {
                        ...t,
                        propertyData: {
                          ...t.propertyData!,
                          level: Math.max(0, (t.propertyData?.level || 0) - 1),
                        },
                      }
                    : t
                ),
              }))
              addLog(
                `${player.name} 对 ${target.name} 的 ${prop.name} 使用拆迁卡`
              )
              success = true
            }
          }
        }
        break

      default:
        addLog(`${player.name} 使用了 ${card.name}`)
        success = true
    }

    if (success) {
      removeCard(playerId, cardId)
    }

    return success
  },

  refreshShop: () => {
    set({
      shopCards: [
        createRandomCard(),
        createRandomCard(),
        createRandomCard(),
        createRandomCard(),
      ],
    })
  },

  buyCard: (playerId, cardIndex) => {
    const { shopCards, getPlayer, spendMoney, addCard, addLog } = get()
    const player = getPlayer(playerId)

    if (!player || cardIndex >= shopCards.length) return false

    const card = shopCards[cardIndex]
    if (player.money < card.price) return false
    if (player.cards.length >= GameConstants.MaxCardsInHand) return false

    spendMoney(playerId, card.price)
    addCard(playerId, { ...card, id: generateId() })

    // Replace bought card with new one
    set((state) => ({
      shopCards: state.shopCards.map((c, i) =>
        i === cardIndex ? createRandomCard() : c
      ),
    }))

    addLog(`${player.name} 购买了 ${card.name}`)
    return true
  },
})
