/**
 * 大富翁4 - Game Board Component
 * Pixi.js based board rendering
 */

import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '@/stores/gameStore'
import { TileType, TurnState, PlayerState } from '@/types'
import {
  getTileColor,
  getRegionColor,
  getPlayerColor,
  lerp,
  easeOutQuad,
  delay,
} from '@/utils/helpers'

const TILE_WIDTH = 80
const TILE_HEIGHT = 80
const PLAYER_SIZE = 24

export function Board() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const tilesContainerRef = useRef<PIXI.Container | null>(null)
  const playersContainerRef = useRef<PIXI.Container | null>(null)
  const isInitializedRef = useRef(false)

  const tiles = useGameStore((state) => state.tiles)
  const players = useGameStore((state) => state.players)
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex)
  const turnState = useGameStore((state) => state.turnState)
  const lastDiceResult = useGameStore((state) => state.lastDiceResult)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const setTurnState = useGameStore((state) => state.setTurnState)
  const getCurrentPlayer = useGameStore((state) => state.getCurrentPlayer)

  // Initialize Pixi Application
  useEffect(() => {
    if (!containerRef.current) return

    // Prevent double initialization in StrictMode
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    const app = new PIXI.Application({
      width: 900,
      height: 700,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    containerRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    // Create containers
    const tilesContainer = new PIXI.Container()
    tilesContainer.x = 50
    tilesContainer.y = 50
    app.stage.addChild(tilesContainer)
    tilesContainerRef.current = tilesContainer

    const playersContainer = new PIXI.Container()
    playersContainer.x = 50
    playersContainer.y = 50
    app.stage.addChild(playersContainer)
    playersContainerRef.current = playersContainer

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true })
        appRef.current = null
        tilesContainerRef.current = null
        playersContainerRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // Render tiles
  useEffect(() => {
    if (!tilesContainerRef.current || tiles.length === 0) return

    const container = tilesContainerRef.current
    container.removeChildren()

    tiles.forEach((tile) => {
      const tileGraphics = new PIXI.Graphics()

      // Get tile color
      let color = getTileColor(tile.type)
      if (tile.type === TileType.Property && tile.propertyData) {
        color = getRegionColor(tile.propertyData.region)
      }

      // Draw tile background
      tileGraphics.beginFill(color, 0.8)
      tileGraphics.lineStyle(2, 0xffffff, 0.5)
      tileGraphics.drawRoundedRect(0, 0, TILE_WIDTH - 4, TILE_HEIGHT - 4, 8)
      tileGraphics.endFill()

      // Position
      tileGraphics.x = tile.position.x
      tileGraphics.y = tile.position.y

      // Add tile name
      const nameText = new PIXI.Text(tile.name, {
        fontSize: 12,
        fill: 0xffffff,
        align: 'center',
        fontWeight: 'bold',
      })
      nameText.anchor.set(0.5)
      nameText.x = (TILE_WIDTH - 4) / 2
      nameText.y = (TILE_HEIGHT - 4) / 2 - 10
      tileGraphics.addChild(nameText)

      // Add property level indicator if applicable
      if (tile.type === TileType.Property && tile.propertyData) {
        const { level, ownerId } = tile.propertyData

        if (level > 0 && ownerId) {
          // Draw level indicators (houses)
          for (let i = 0; i < level; i++) {
            const house = new PIXI.Graphics()
            house.beginFill(0xffcc00)
            house.drawRect(10 + i * 18, TILE_HEIGHT - 20, 14, 10)
            house.endFill()
            // Roof
            house.beginFill(0xff6600)
            house.moveTo(10 + i * 18, TILE_HEIGHT - 20)
            house.lineTo(17 + i * 18, TILE_HEIGHT - 28)
            house.lineTo(24 + i * 18, TILE_HEIGHT - 20)
            house.closePath()
            house.endFill()
            tileGraphics.addChild(house)
          }

          // Owner indicator
          const ownerIndex = players.findIndex((p) => p.id === ownerId)
          if (ownerIndex >= 0) {
            const ownerDot = new PIXI.Graphics()
            ownerDot.beginFill(getPlayerColor(ownerIndex))
            ownerDot.drawCircle(TILE_WIDTH - 15, 10, 6)
            ownerDot.endFill()
            tileGraphics.addChild(ownerDot)
          }
        }

        // Show price for unowned properties
        if (!ownerId) {
          const priceText = new PIXI.Text(`$${tile.propertyData.basePrice}`, {
            fontSize: 10,
            fill: 0xffffff,
          })
          priceText.anchor.set(0.5)
          priceText.x = (TILE_WIDTH - 4) / 2
          priceText.y = (TILE_HEIGHT - 4) / 2 + 12
          tileGraphics.addChild(priceText)
        }
      }

      // Add index number (for debugging)
      const indexText = new PIXI.Text(`${tile.index}`, {
        fontSize: 8,
        fill: 0xaaaaaa,
      })
      indexText.x = 4
      indexText.y = 2
      tileGraphics.addChild(indexText)

      container.addChild(tileGraphics)
    })
  }, [tiles, players])

  // Render players - recreate sprites every time to avoid stale references
  useEffect(() => {
    if (!playersContainerRef.current || players.length === 0 || tiles.length === 0) return

    const container = playersContainerRef.current

    // Clear all existing player sprites
    container.removeChildren()

    players.forEach((player, index) => {
      if (player.state === PlayerState.Bankrupt) {
        return
      }

      const sprite = new PIXI.Graphics()

      // Draw player token
      const color = getPlayerColor(index)
      sprite.beginFill(color)
      sprite.lineStyle(3, 0xffffff, 1)
      sprite.drawCircle(0, 0, PLAYER_SIZE / 2)
      sprite.endFill()

      // Add player number
      const numberText = new PIXI.Text(`${index + 1}`, {
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: 'bold',
      })
      numberText.anchor.set(0.5)
      sprite.addChild(numberText)

      // Position on tile
      const tile = tiles[player.currentTileIndex]
      if (tile) {
        // Offset players so they don't overlap
        const offsetX = (index % 2) * 25 - 10
        const offsetY = Math.floor(index / 2) * 25 - 10

        sprite.x = tile.position.x + TILE_WIDTH / 2 + offsetX
        sprite.y = tile.position.y + TILE_HEIGHT / 2 + offsetY
      }

      // Highlight current player
      if (index === currentPlayerIndex) {
        sprite.scale.set(1.3)
        // Add glow effect
        const glow = new PIXI.Graphics()
        glow.beginFill(color, 0.3)
        glow.drawCircle(0, 0, PLAYER_SIZE)
        glow.endFill()
        sprite.addChildAt(glow, 0)
      }

      // Store reference for animation
      sprite.name = player.id
      container.addChild(sprite)
    })
  }, [players, tiles, currentPlayerIndex])

  // Handle player movement animation
  const animateMovement = useCallback(
    async (playerId: string, startIndex: number, steps: number) => {
      if (!playersContainerRef.current || tiles.length === 0) return

      const sprite = playersContainerRef.current.children.find(
        (child) => child.name === playerId
      ) as PIXI.Graphics | undefined

      if (!sprite) return

      const playerIndex = players.findIndex((p) => p.id === playerId)
      const offsetX = (playerIndex % 2) * 25 - 10
      const offsetY = Math.floor(playerIndex / 2) * 25 - 10

      // Animate step by step
      for (let i = 1; i <= steps; i++) {
        const targetIndex = (startIndex + i) % tiles.length
        const targetTile = tiles[targetIndex]

        if (!targetTile) continue

        const targetX = targetTile.position.x + TILE_WIDTH / 2 + offsetX
        const targetY = targetTile.position.y + TILE_HEIGHT / 2 + offsetY

        const animStartX = sprite.x
        const animStartY = sprite.y

        // Animate to this tile
        const duration = 200 // ms per tile
        const startTime = Date.now()

        while (Date.now() - startTime < duration) {
          const progress = (Date.now() - startTime) / duration
          const eased = easeOutQuad(progress)

          sprite.x = lerp(animStartX, targetX, eased)
          sprite.y = lerp(animStartY, targetY, eased)

          await delay(16) // ~60fps
        }

        sprite.x = targetX
        sprite.y = targetY

        await delay(100) // Pause between steps
      }
    },
    [tiles, players]
  )

  // Listen for dice roll and trigger movement
  useEffect(() => {
    if (turnState === TurnState.Rolling && lastDiceResult) {
      const currentPlayer = getCurrentPlayer()
      if (!currentPlayer) return

      const startIndex = currentPlayer.currentTileIndex
      const steps = lastDiceResult.total

      setTurnState(TurnState.Moving)

      animateMovement(currentPlayer.id, startIndex, steps).then(() => {
        movePlayer(currentPlayer.id, steps)
        setTurnState(TurnState.OnTile)
      })
    }
  }, [turnState, lastDiceResult, getCurrentPlayer, animateMovement, movePlayer, setTurnState])

  return (
    <div
      ref={containerRef}
      style={{
        width: '900px',
        height: '700px',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  )
}
