/**
 * 大富翁4 - Game Board Component
 * Pixi.js based board rendering
 */

import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '@/stores/gameStore'
import { TileType, TurnState, PlayerState, PropertyFacility } from '@/types'
import {
  BoardMetrics,
  clamp,
  getTileColor,
  getRegionColor,
  getPlayerColor,
  lerp,
  easeOutQuad,
  delay,
} from '@/utils/helpers'

const BOARD_WIDTH = BoardMetrics.boardWidth
const BOARD_HEIGHT = BoardMetrics.boardHeight
const TILE_WIDTH = BoardMetrics.tileWidth
const TILE_HEIGHT = BoardMetrics.tileHeight
const TILE_THICKNESS = 18
const PLAYER_SIZE = 24
const PLAYER_TAG = 'player:'
const BUILDING_TAG = 'building:'
const CAMERA_IDLE_ZOOM = 1.02
const CAMERA_MOVE_ZOOM = 1.05

type IsoFaceColors = {
  top: number
  left: number
  right: number
  stroke: number
}

const mixColor = (color: number, mix: number, amount: number): number => {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  const mr = (mix >> 16) & 0xff
  const mg = (mix >> 8) & 0xff
  const mb = mix & 0xff
  const nr = Math.round(r + (mr - r) * amount)
  const ng = Math.round(g + (mg - g) * amount)
  const nb = Math.round(b + (mb - b) * amount)
  return (nr << 16) + (ng << 8) + nb
}

const lighten = (color: number, amount: number) => mixColor(color, 0xffffff, amount)
const darken = (color: number, amount: number) => mixColor(color, 0x000000, amount)

const createIsoPrism = (
  width: number,
  height: number,
  depth: number,
  colors: IsoFaceColors,
  direction: 'up' | 'down'
): PIXI.Container => {
  const container = new PIXI.Container()
  const sides = new PIXI.Graphics()
  const top = new PIXI.Graphics()

  const halfWidth = width / 2
  const halfHeight = height / 2
  const topOffset = direction === 'up' ? -depth : 0
  const bottomOffset = direction === 'up' ? 0 : depth

  const topPoint = { x: 0, y: -halfHeight + topOffset }
  const rightPoint = { x: halfWidth, y: 0 + topOffset }
  const bottomPoint = { x: 0, y: halfHeight + topOffset }
  const leftPoint = { x: -halfWidth, y: 0 + topOffset }

  const rightPointBottom = { x: halfWidth, y: 0 + bottomOffset }
  const bottomPointBottom = { x: 0, y: halfHeight + bottomOffset }
  const leftPointBottom = { x: -halfWidth, y: 0 + bottomOffset }

  sides.beginFill(colors.left)
  sides.drawPolygon([
    leftPoint.x,
    leftPoint.y,
    bottomPoint.x,
    bottomPoint.y,
    bottomPointBottom.x,
    bottomPointBottom.y,
    leftPointBottom.x,
    leftPointBottom.y,
  ])
  sides.endFill()

  sides.beginFill(colors.right)
  sides.drawPolygon([
    rightPoint.x,
    rightPoint.y,
    bottomPoint.x,
    bottomPoint.y,
    bottomPointBottom.x,
    bottomPointBottom.y,
    rightPointBottom.x,
    rightPointBottom.y,
  ])
  sides.endFill()

  top.lineStyle(1, colors.stroke, 0.45)
  top.beginFill(colors.top)
  top.drawPolygon([
    topPoint.x,
    topPoint.y,
    rightPoint.x,
    rightPoint.y,
    bottomPoint.x,
    bottomPoint.y,
    leftPoint.x,
    leftPoint.y,
  ])
  top.endFill()

  container.addChild(sides, top)
  return container
}

const getDepthScale = (y: number, highlight: boolean) => {
  const t = clamp(y / BOARD_HEIGHT, 0, 1)
  const baseScale = 0.9 + t * 0.18
  return highlight ? baseScale * 1.08 : baseScale
}

export function Board() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const tilesContainerRef = useRef<PIXI.Container | null>(null)
  const entitiesContainerRef = useRef<PIXI.Container | null>(null)
  const backgroundContainerRef = useRef<PIXI.Container | null>(null)
  const cameraContainerRef = useRef<PIXI.Container | null>(null)
  const cameraTargetRef = useRef({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2, zoom: CAMERA_IDLE_ZOOM })
  const boardCenterRef = useRef({ x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 })
  const isInitializedRef = useRef(false)

  const tiles = useGameStore((state) => state.tiles)
  const players = useGameStore((state) => state.players)
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex)
  const turnState = useGameStore((state) => state.turnState)
  const setTurnState = useGameStore((state) => state.setTurnState)

  // Action Queue
  const currentAction = useGameStore((state) => state.currentAction)
  const completeAction = useGameStore((state) => state.completeAction)

  // Initialize Pixi Application
  useEffect(() => {
    if (!containerRef.current) return

    // Prevent double initialization in StrictMode
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const app = new PIXI.Application({
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      backgroundColor: 0x131826,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    containerRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    const cameraContainer = new PIXI.Container()
    cameraContainer.position.set(BOARD_WIDTH / 2, BOARD_HEIGHT / 2)
    cameraContainer.pivot.set(BOARD_WIDTH / 2, BOARD_HEIGHT / 2)
    cameraContainer.scale.set(CAMERA_IDLE_ZOOM)
    app.stage.addChild(cameraContainer)
    cameraContainerRef.current = cameraContainer

    const worldContainer = new PIXI.Container()
    worldContainer.sortableChildren = true
    cameraContainer.addChild(worldContainer)

    const backgroundContainer = new PIXI.Container()
    backgroundContainer.zIndex = 0
    worldContainer.addChild(backgroundContainer)
    backgroundContainerRef.current = backgroundContainer

    const tilesContainer = new PIXI.Container()
    tilesContainer.sortableChildren = true
    tilesContainer.zIndex = 1
    worldContainer.addChild(tilesContainer)
    tilesContainerRef.current = tilesContainer

    const entitiesContainer = new PIXI.Container()
    entitiesContainer.sortableChildren = true
    entitiesContainer.zIndex = 2
    worldContainer.addChild(entitiesContainer)
    entitiesContainerRef.current = entitiesContainer

    const updateCamera = () => {
      if (!cameraContainerRef.current) return
      const target = cameraTargetRef.current
      cameraContainerRef.current.pivot.x = lerp(
        cameraContainerRef.current.pivot.x,
        target.x,
        0.12
      )
      cameraContainerRef.current.pivot.y = lerp(
        cameraContainerRef.current.pivot.y,
        target.y,
        0.12
      )
      const nextZoom = lerp(cameraContainerRef.current.scale.x, target.zoom, 0.06)
      cameraContainerRef.current.scale.set(nextZoom)
    }

    app.ticker.add(updateCamera)

    return () => {
      app.ticker.remove(updateCamera)
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
        tilesContainerRef.current = null
        entitiesContainerRef.current = null
        backgroundContainerRef.current = null
        cameraContainerRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // Render tiles and buildings
  useEffect(() => {
    if (!tilesContainerRef.current || !entitiesContainerRef.current || !backgroundContainerRef.current) {
      return
    }
    if (tiles.length === 0) return

    const tilesContainer = tilesContainerRef.current
    const entitiesContainer = entitiesContainerRef.current
    const backgroundContainer = backgroundContainerRef.current

    tilesContainer.removeChildren()
    backgroundContainer.removeChildren()

    const bounds = tiles.reduce(
      (acc, tile) => {
        acc.minX = Math.min(acc.minX, tile.position.x)
        acc.maxX = Math.max(acc.maxX, tile.position.x)
        acc.minY = Math.min(acc.minY, tile.position.y)
        acc.maxY = Math.max(acc.maxY, tile.position.y)
        return acc
      },
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    )

    const maxVisualScale = tiles.reduce(
      (max, tile) => Math.max(max, tile.propertyData?.visualScale ?? 1),
      1
    )
    const boardWidth = bounds.maxX - bounds.minX + TILE_WIDTH * 1.6 * maxVisualScale
    const boardHeight = bounds.maxY - bounds.minY + TILE_HEIGHT * 1.6 * maxVisualScale
    const boardCenterX = (bounds.minX + bounds.maxX) / 2
    const boardCenterY =
      (bounds.minY + bounds.maxY) / 2 + TILE_HEIGHT * 0.1 * maxVisualScale
    boardCenterRef.current = { x: boardCenterX, y: boardCenterY }
    if (turnState !== TurnState.Moving) {
      cameraTargetRef.current.x = boardCenterX
      cameraTargetRef.current.y = boardCenterY
      cameraTargetRef.current.zoom = CAMERA_IDLE_ZOOM
    }

    const boardBaseColors: IsoFaceColors = {
      top: 0x2a3246,
      left: 0x1a1f2d,
      right: 0x22283a,
      stroke: 0x3f4a63,
    }
    const boardBase = createIsoPrism(
      boardWidth,
      boardHeight,
      TILE_THICKNESS * 1.6,
      boardBaseColors,
      'down'
    )
    boardBase.x = boardCenterX
    boardBase.y = boardCenterY + TILE_THICKNESS * 1.2
    backgroundContainer.addChild(boardBase)

    // Remove existing buildings
    const buildingChildren = entitiesContainer.children.filter((child) =>
      child.name?.startsWith(BUILDING_TAG)
    )
    buildingChildren.forEach((child) => {
      entitiesContainer.removeChild(child)
    })

    tiles.forEach((tile) => {
      const tileContainer = new PIXI.Container()
      tileContainer.x = tile.position.x
      tileContainer.y = tile.position.y
      tileContainer.zIndex = tile.position.y

      const visualScale = tile.propertyData?.visualScale ?? 1
      const tileWidth = TILE_WIDTH * visualScale
      const tileHeight = TILE_HEIGHT * visualScale
      const tileThickness = TILE_THICKNESS * (0.9 + 0.2 * visualScale)

      let baseColor = getTileColor(tile.type)
      if (tile.type === TileType.Property && tile.propertyData) {
        baseColor = getRegionColor(tile.propertyData.region)
      }

      const tileColors: IsoFaceColors = {
        top: lighten(baseColor, 0.12),
        left: darken(baseColor, 0.28),
        right: darken(baseColor, 0.16),
        stroke: lighten(baseColor, 0.32),
      }
      const tilePrism = createIsoPrism(tileWidth, tileHeight, tileThickness, tileColors, 'down')
      tileContainer.addChild(tilePrism)

      const nameText = new PIXI.Text(tile.name, {
        fontSize: 12,
        fill: 0xf7f7f2,
        fontWeight: 'bold',
      })
      nameText.anchor.set(0.5)
      nameText.x = 0
      nameText.y = -tileHeight * 0.15
      tileContainer.addChild(nameText)

      if (tile.type === TileType.Property && tile.propertyData) {
        const { level, ownerId } = tile.propertyData

        if (!ownerId) {
          const priceText = new PIXI.Text(`$${tile.propertyData.basePrice}`, {
            fontSize: 10,
            fill: 0xe3e3e3,
          })
          priceText.anchor.set(0.5)
          priceText.x = 0
          priceText.y = tileHeight * 0.12
          tileContainer.addChild(priceText)
        }

        if (level > 0) {
          const ownerIndex = ownerId ? players.findIndex((p) => p.id === ownerId) : -1
          const ownerColor = ownerIndex >= 0 ? getPlayerColor(ownerIndex) : 0xeeeeee
          const building = new PIXI.Container()
          building.name = `${BUILDING_TAG}${tile.index}`
          building.x = tile.position.x
          building.y = tile.position.y - tileHeight * 0.18
          building.zIndex = tile.position.y + 1

          const baseWidth = tileWidth * (0.36 + level * 0.05)
          const baseHeight = tileHeight * (0.36 + level * 0.05)
          const baseDepth = 14 + level * 10
          const buildingBase = lighten(baseColor, 0.2)

          const baseColors: IsoFaceColors = {
            top: lighten(buildingBase, 0.18),
            left: darken(buildingBase, 0.28),
            right: darken(buildingBase, 0.12),
            stroke: lighten(buildingBase, 0.32),
          }

          const shadow = new PIXI.Graphics()
          shadow.beginFill(0x000000, 0.18)
          shadow.drawEllipse(0, tileHeight * 0.22, baseWidth * 0.4, baseHeight * 0.2)
          shadow.endFill()
          shadow.filters = [new PIXI.filters.BlurFilter(4)]
          building.addChild(shadow)

          const baseBlock = createIsoPrism(baseWidth, baseHeight, baseDepth, baseColors, 'up')
          building.addChild(baseBlock)

          if (level >= 2) {
            const midColors: IsoFaceColors = {
              top: lighten(buildingBase, 0.3),
              left: darken(buildingBase, 0.35),
              right: darken(buildingBase, 0.18),
              stroke: lighten(buildingBase, 0.4),
            }
            const midBlock = createIsoPrism(
              baseWidth * 0.75,
              baseHeight * 0.75,
              baseDepth * 0.7,
              midColors,
              'up'
            )
            midBlock.y = -baseDepth + 4
            building.addChild(midBlock)
          }

          if (level >= 3) {
            const towerColors: IsoFaceColors = {
              top: lighten(buildingBase, 0.4),
              left: darken(buildingBase, 0.4),
              right: darken(buildingBase, 0.22),
              stroke: lighten(buildingBase, 0.5),
            }
            const towerBlock = createIsoPrism(
              baseWidth * 0.5,
              baseHeight * 0.5,
              baseDepth * 0.9,
              towerColors,
              'up'
            )
            towerBlock.y = -baseDepth - baseDepth * 0.35
            building.addChild(towerBlock)
          }

          const flagPole = new PIXI.Graphics()
          flagPole.lineStyle(2, 0xdddddd, 0.9)
          flagPole.moveTo(baseWidth * 0.2, -baseDepth * 0.9)
          flagPole.lineTo(baseWidth * 0.2, -baseDepth * 0.3)
          building.addChild(flagPole)

          const flag = new PIXI.Graphics()
          flag.beginFill(ownerColor, 0.9)
          flag.moveTo(baseWidth * 0.2, -baseDepth * 0.9)
          flag.lineTo(baseWidth * 0.2 + 12, -baseDepth * 0.82)
          flag.lineTo(baseWidth * 0.2, -baseDepth * 0.74)
          flag.closePath()
          flag.endFill()
          building.addChild(flag)

          entitiesContainer.addChild(building)
        }

        if (tile.propertyData.resortEnabled && tile.propertyData.facilityType !== PropertyFacility.None) {
          const facilityLabel =
            tile.propertyData.facilityType === PropertyFacility.Park
              ? '公园'
              : tile.propertyData.facilityType === PropertyFacility.Hotel
                ? '酒店'
                : '商场'
          const facilityText = new PIXI.Text(facilityLabel, {
            fontSize: 10,
            fill: 0xf6f1d1,
            fontWeight: 'bold',
          })
          facilityText.anchor.set(0.5)
          facilityText.x = 0
          facilityText.y = tileHeight * 0.28
          tileContainer.addChild(facilityText)
        }
      }

      const indexText = new PIXI.Text(`${tile.index}`, {
        fontSize: 8,
        fill: 0x9ea5b6,
      })
      indexText.x = -tileWidth * 0.38
      indexText.y = -tileHeight * 0.1
      tileContainer.addChild(indexText)

      tilesContainer.addChild(tileContainer)
    })
  }, [tiles, players, turnState])

  const getPlayerAnchor = useCallback(
    (tileIndex: number, playerIndex: number) => {
      const tile = tiles[tileIndex]
      if (!tile) return { x: 0, y: 0 }
      const offsetX = (playerIndex % 2) * 16 - 8
      const offsetY = Math.floor(playerIndex / 2) * 12
      return {
        x: tile.position.x + offsetX,
        y: tile.position.y + TILE_HEIGHT * 0.28 + offsetY,
      }
    },
    [tiles]
  )

  // Render players
  useEffect(() => {
    if (!entitiesContainerRef.current || players.length === 0 || tiles.length === 0) return

    const container = entitiesContainerRef.current

    const playerChildren = container.children.filter((child) =>
      child.name?.startsWith(PLAYER_TAG)
    )
    playerChildren.forEach((child) => {
      container.removeChild(child)
    })

    players.forEach((player, index) => {
      if (player.state === PlayerState.Bankrupt) {
        return
      }

      const sprite = new PIXI.Container()
      sprite.name = `${PLAYER_TAG}${player.id}`

      const color = getPlayerColor(index)

      const shadow = new PIXI.Graphics()
      shadow.beginFill(0x000000, 0.2)
      shadow.drawEllipse(0, 8, PLAYER_SIZE * 0.5, PLAYER_SIZE * 0.25)
      shadow.endFill()
      shadow.filters = [new PIXI.filters.BlurFilter(2)]
      sprite.addChild(shadow)

      const token = new PIXI.Graphics()
      token.beginFill(color, 0.95)
      token.lineStyle(2, 0xffffff, 0.85)
      token.drawEllipse(0, -PLAYER_SIZE * 0.2, PLAYER_SIZE * 0.5, PLAYER_SIZE * 0.35)
      token.endFill()
      sprite.addChild(token)

      const gloss = new PIXI.Graphics()
      gloss.beginFill(0xffffff, 0.3)
      gloss.drawEllipse(-PLAYER_SIZE * 0.12, -PLAYER_SIZE * 0.35, PLAYER_SIZE * 0.18, PLAYER_SIZE * 0.12)
      gloss.endFill()
      sprite.addChild(gloss)

      const numberText = new PIXI.Text(`${index + 1}`, {
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: 'bold',
      })
      numberText.anchor.set(0.5)
      numberText.y = -PLAYER_SIZE * 0.28
      sprite.addChild(numberText)

      if (index === currentPlayerIndex) {
        const ring = new PIXI.Graphics()
        ring.lineStyle(2, color, 0.7)
        ring.drawEllipse(0, 8, PLAYER_SIZE * 0.7, PLAYER_SIZE * 0.32)
        sprite.addChildAt(ring, 1)
      }

      const anchor = getPlayerAnchor(player.currentTileIndex, index)
      sprite.x = anchor.x
      sprite.y = anchor.y
      const scale = getDepthScale(sprite.y, index === currentPlayerIndex)
      sprite.scale.set(scale)
      sprite.zIndex = sprite.y + 2

      container.addChild(sprite)
    })
  }, [players, tiles, currentPlayerIndex, getPlayerAnchor])

  // Camera focus
  useEffect(() => {
    if (turnState === TurnState.Moving) return
    cameraTargetRef.current.x = boardCenterRef.current.x
    cameraTargetRef.current.y = boardCenterRef.current.y
    cameraTargetRef.current.zoom = CAMERA_IDLE_ZOOM
  }, [turnState])

  // Handle player movement animation (步进式移动)
  const animateMovement = useCallback(
    async (playerId: string, path: number[]) => {
      if (!entitiesContainerRef.current || tiles.length === 0 || path.length === 0) return

      const sprite = entitiesContainerRef.current.children.find(
        (child) => child.name === `${PLAYER_TAG}${playerId}`
      ) as PIXI.Container | undefined

      if (!sprite) return

      const playerIndex = players.findIndex((p) => p.id === playerId)

      for (const targetIndex of path) {
        const anchor = getPlayerAnchor(targetIndex, playerIndex)
        const targetX = anchor.x
        const targetY = anchor.y

        const animStartX = sprite.x
        const animStartY = sprite.y
        const startScale = sprite.scale.x
        const targetScale = getDepthScale(targetY, playerIndex === currentPlayerIndex)

        const duration = 220
        const startTime = Date.now()
        const hopHeight = 10

        while (Date.now() - startTime < duration) {
          const progress = (Date.now() - startTime) / duration
          const eased = easeOutQuad(progress)
          const hop = Math.sin(progress * Math.PI) * hopHeight

          sprite.x = lerp(animStartX, targetX, eased)
          sprite.y = lerp(animStartY, targetY, eased) - hop
          const scale = lerp(startScale, targetScale, eased) + hop * 0.003
          sprite.scale.set(scale)
          sprite.zIndex = sprite.y + 2

          cameraTargetRef.current.x = sprite.x
          cameraTargetRef.current.y = sprite.y - TILE_HEIGHT * 0.2
          cameraTargetRef.current.zoom = CAMERA_MOVE_ZOOM

          await delay(16)
        }

        sprite.x = targetX
        sprite.y = targetY
        sprite.scale.set(targetScale)
        sprite.zIndex = sprite.y + 2

        await delay(90)
      }

      cameraTargetRef.current.zoom = CAMERA_IDLE_ZOOM
    },
    [tiles, players, currentPlayerIndex, getPlayerAnchor]
  )

  // Handle teleport animation (瞬移带闪烁效果)
  const animateTeleport = useCallback(
    async (playerId: string, _fromIndex: number, toIndex: number) => {
      if (!entitiesContainerRef.current || tiles.length === 0) return

      const sprite = entitiesContainerRef.current.children.find(
        (child) => child.name === `${PLAYER_TAG}${playerId}`
      ) as PIXI.Container | undefined

      if (!sprite) return

      const playerIndex = players.findIndex((p) => p.id === playerId)
      const anchor = getPlayerAnchor(toIndex, playerIndex)

      // 消失动画
      const fadeOutDuration = 150
      const fadeOutStart = Date.now()
      while (Date.now() - fadeOutStart < fadeOutDuration) {
        const progress = (Date.now() - fadeOutStart) / fadeOutDuration
        sprite.alpha = 1 - progress
        sprite.scale.set(sprite.scale.x * (1 - progress * 0.02))
        await delay(16)
      }

      // 移动到目标位置
      sprite.x = anchor.x
      sprite.y = anchor.y
      sprite.zIndex = sprite.y + 2
      const targetScale = getDepthScale(anchor.y, playerIndex === currentPlayerIndex)
      sprite.scale.set(targetScale)

      // 更新相机
      cameraTargetRef.current.x = anchor.x
      cameraTargetRef.current.y = anchor.y - TILE_HEIGHT * 0.2
      cameraTargetRef.current.zoom = CAMERA_MOVE_ZOOM

      // 出现动画
      const fadeInDuration = 200
      const fadeInStart = Date.now()
      while (Date.now() - fadeInStart < fadeInDuration) {
        const progress = (Date.now() - fadeInStart) / fadeInDuration
        sprite.alpha = progress
        await delay(16)
      }

      sprite.alpha = 1
      cameraTargetRef.current.zoom = CAMERA_IDLE_ZOOM
    },
    [tiles, players, currentPlayerIndex, getPlayerAnchor]
  )

  // Handle jail/hospital animation (特殊传送)
  const animateSpecialTeleport = useCallback(
    async (playerId: string, toIndex: number) => {
      // 使用与普通传送相同的动画，但可以在未来添加特殊效果
      await animateTeleport(playerId, 0, toIndex)
    },
    [animateTeleport]
  )

  // Listen for currentAction and play corresponding animation
  useEffect(() => {
    if (!currentAction) return

    const playAnimation = async () => {
      setTurnState(TurnState.Moving)

      switch (currentAction.type) {
        case 'MOVE':
          await animateMovement(currentAction.playerId, currentAction.path)
          break

        case 'TELEPORT':
          await animateTeleport(
            currentAction.playerId,
            currentAction.fromIndex,
            currentAction.toIndex
          )
          break

        case 'TO_JAIL':
          await animateSpecialTeleport(currentAction.playerId, currentAction.jailIndex)
          break

        case 'TO_HOSPITAL':
          await animateSpecialTeleport(currentAction.playerId, currentAction.hospitalIndex)
          break

        case 'BANKRUPT':
          // 破产动画可以在未来添加
          break
      }

      // 动画完成，通知 Action Queue 执行状态更新并取下一个 Action
      completeAction()
      setTurnState(TurnState.OnTile)
    }

    playAnimation()
  }, [currentAction, animateMovement, animateTeleport, animateSpecialTeleport, completeAction, setTurnState])

  return (
    <div
      ref={containerRef}
      style={{
        width: `${BOARD_WIDTH}px`,
        height: `${BOARD_HEIGHT}px`,
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 18px 40px rgba(10, 10, 20, 0.45)',
      }}
    />
  )
}
