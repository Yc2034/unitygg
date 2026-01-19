/**
 * 大富翁4 - AI Controller
 * AI 玩家自动决策逻辑
 */

import { useGameStore } from '@/stores/gameStore'
import { TileType, GameState, TurnState, PropertyFacility } from '@/types'
import { GameConstants } from '@/constants/maps'

export interface AIDecision {
  action: 'roll' | 'purchase' | 'upgrade' | 'endTurn' | 'buyCard' | 'useCard'
  targetIndex?: number
  targetPlayerId?: string
}

/**
 * AI 难度配置
 */
const AI_CONFIG = {
  easy: {
    purchaseThreshold: 0.3, // 只有当金钱超过地产价格的30%时才购买
    upgradeChance: 0.3, // 30%概率升级
    buyCardChance: 0.2, // 20%概率购买卡片
    useCardChance: 0.1, // 10%概率使用卡片
  },
  normal: {
    purchaseThreshold: 0.5,
    upgradeChance: 0.5,
    buyCardChance: 0.4,
    useCardChance: 0.3,
  },
  hard: {
    purchaseThreshold: 0.7,
    upgradeChance: 0.8,
    buyCardChance: 0.6,
    useCardChance: 0.5,
  },
}

/**
 * AI 控制器类
 */
export class AIController {
  private actionDelay: number

  constructor(actionDelay: number = 1000) {
    this.actionDelay = actionDelay
  }

  /**
   * 执行 AI 回合
   */
  async executeAITurn(): Promise<void> {
    const store = useGameStore.getState()
    const currentPlayer = store.getCurrentPlayer()

    if (!currentPlayer || !currentPlayer.isAI) return
    if (store.gameState !== GameState.Playing) return

    const difficulty = currentPlayer.aiDifficulty || 'normal'
    const config = AI_CONFIG[difficulty]

    // 等待一小段时间，让玩家能看到 AI 在思考
    await this.delay(this.actionDelay)

    switch (store.turnState) {
      case TurnState.WaitingForDice:
        await this.handleWaitingForDice()
        break

      case TurnState.OnTile:
        await this.handleOnTile(currentPlayer, config)
        break

      case TurnState.ChoosingDirection:
        await this.handleChoosingDirection()
        break
    }
  }

  /**
   * 处理等待掷骰子状态
   */
  private async handleWaitingForDice(): Promise<void> {
    const store = useGameStore.getState()
    store.rollDice()
  }

  /**
   * 处理踩到格子状态
   */
  private async handleOnTile(
    player: ReturnType<typeof useGameStore.getState>['players'][0],
    config: (typeof AI_CONFIG)['normal']
  ): Promise<void> {
    const store = useGameStore.getState()
    const currentTile = store.getTile(player.currentTileIndex)

    if (!currentTile) {
      store.endTurn()
      return
    }

    // 处理地产格子
    if (currentTile.type === TileType.Property && currentTile.propertyData) {
      const { ownerId, level, facilityType, resortEnabled } = currentTile.propertyData
      const price =
        currentTile.propertyData.basePrice *
        GameConstants.RegionMultipliers[currentTile.propertyData.region]

      // 未被拥有的地产 - 考虑购买
      if (ownerId === null) {
        const shouldPurchase =
          player.money >= price && player.money * config.purchaseThreshold >= price

        if (shouldPurchase) {
          await this.delay(500)
          store.purchaseProperty(player.id, currentTile.index)
          await this.delay(500)
          store.endTurn()
          return
        }
      }

      // 自己的地产 - 选择酒店
      if (ownerId === player.id && resortEnabled && facilityType === PropertyFacility.None) {
        await this.delay(500)
        store.setPropertyFacility(currentTile.index, PropertyFacility.Hotel)
        await this.delay(500)
        store.endTurn()
        return
      }

      // 自己的地产 - 考虑升级
      if (!resortEnabled && ownerId === player.id && level < GameConstants.MaxPropertyLevel) {
        const upgradeCost = currentTile.propertyData.basePrice * level * 0.5
        const shouldUpgrade =
          player.money >= upgradeCost &&
          player.money * config.purchaseThreshold >= upgradeCost &&
          Math.random() < config.upgradeChance

        if (shouldUpgrade) {
          await this.delay(500)
          store.upgradeProperty(currentTile.index)
          await this.delay(500)
          store.endTurn()
          return
        }
      }
    }

    // 处理商店格子 - 考虑购买卡片
    if (currentTile.type === TileType.Shop && Math.random() < config.buyCardChance) {
      const affordableCards = store.shopCards
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => player.money >= card.price)
        .filter(() => player.cards.length < GameConstants.MaxCardsInHand)

      if (affordableCards.length > 0) {
        // 随机购买一张能买得起的卡
        const randomCard = affordableCards[Math.floor(Math.random() * affordableCards.length)]
        await this.delay(500)
        store.buyCard(player.id, randomCard.index)
      }
    }

    // 处理免费升级机会
    if (store.hasFreeUpgrade) {
      const ownedProperties = store.tiles.filter(
        (t) =>
          t.propertyData?.ownerId === player.id &&
          t.propertyData.level < 3 &&
          !t.propertyData.resortEnabled
      )
      if (ownedProperties.length > 0) {
        // 升级等级最低的地产
        const lowestLevel = ownedProperties.sort(
          (a, b) => (a.propertyData?.level || 0) - (b.propertyData?.level || 0)
        )[0]
        useGameStore.setState((state) => ({
          tiles: state.tiles.map((t) =>
            t.index === lowestLevel.index
              ? {
                ...t,
                propertyData: { ...t.propertyData!, level: t.propertyData!.level + 1 },
              }
              : t
          ),
        }))
        store.addLog(`${player.name} 使用免费升级机会升级了 ${lowestLevel.name}`)
        store.setHasFreeUpgrade(false)
      }
    }

    await this.delay(500)
    store.endTurn()
  }

  private async handleChoosingDirection(): Promise<void> {
    const store = useGameStore.getState()
    const currentPlayer = store.getCurrentPlayer()
    const pendingMove = store.pendingMove
    if (!pendingMove || pendingMove.options.length === 0) return
    if (pendingMove.playerId !== currentPlayer?.id) return

    await this.delay(500)
    const options = pendingMove.options
    const choice = options[Math.floor(Math.random() * options.length)]
    store.chooseMoveDirection(choice)
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// 单例实例
export const aiController = new AIController(800)
