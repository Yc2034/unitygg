/**
 * 大富翁4 - Game Board Component
 * Pixi.js based board rendering
 */

import { useEffect, useRef, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useGameStore } from '@/stores/gameStore'
import { TileType, TurnState, PlayerState } from '@/types'
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
  // Center camera initially (will be updated)
  const cameraTargetRef = useRef({ x: 0, y: 0, zoom: CAMERA_IDLE_ZOOM })
  const boardCenterRef = useRef({ x: 0, y: 0 })
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
      resizeTo: containerRef.current, // Auto-resize to fill the container div
      backgroundColor: 0x131826,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })

    containerRef.current.appendChild(app.view as HTMLCanvasElement)
    appRef.current = app

    const cameraContainer = new PIXI.Container()
    // Center the camera container in the screen, but shift slightly left to balance visual weight
    const renderCenterX = app.screen.width / 2 - 40;
    const renderCenterY = app.screen.height / 2;

    cameraContainer.position.set(renderCenterX, renderCenterY)
    // Listen to resize to keep it centered with offset
    app.renderer.on('resize', () => {
      const cx = app.screen.width / 2 - 40;
      const cy = app.screen.height / 2;
      cameraContainer.position.set(cx, cy)
    })

    // cameraContainer.pivot is where the camera "looks at"
    cameraContainer.pivot.set(0, 0) // Reset to 0,0 initially, will be controlled by updateCamera
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

    // Render Loop
    tiles.forEach((tile) => {
      // Configuration Defaults
      const config = tile.renderConfig || { style: 'road' }
      const posX = tile.position.x
      const posY = tile.position.y

      // ===========================
      // 1. Render Road (Always render road for continuity)
      // ===========================
      const roadContainer = new PIXI.Container()
      roadContainer.zIndex = posY - 100 // Ensure road is always "floor"
      roadContainer.x = posX
      roadContainer.y = posY

      const roadWidth = TILE_WIDTH * 0.9 // Continuous strip
      const roadHeight = TILE_HEIGHT * 0.9
      const roadThickness = 8

      // Dark Asphalt Style
      const roadColors: IsoFaceColors = {
        top: 0x333333, // Dark asphalt
        left: 0x222222,
        right: 0x2a2a2a,
        stroke: 0x444444
      }

      // Yellow line markings (Road Striping)
      const roadBase = createIsoPrism(roadWidth, roadHeight, roadThickness, roadColors, 'down')
      roadContainer.addChild(roadBase)

      // Add dashed line in middle potentially, or just keep simple for now
      // Simple marking
      const marking = new PIXI.Graphics()
      marking.lineStyle(2, 0xddaa00, 0.6)
      // Isometric line projection roughly
      marking.moveTo(-roadWidth * 0.3, 0)
      marking.lineTo(roadWidth * 0.3, 0)
      // Since it's ISO, flat line needs rotation or projection.
      // Actually simpler: draw small rects on the top face of the roadBase
      // But roadBase is a container with Graphics.
      // Let's just create a separate graphic for markings on top
      const stripes = new PIXI.Graphics()
      stripes.beginFill(0xffcc00, 0.8)
      // Draw a few dashes along the road direction
      // Assuming road is somewhat linear or just a patch.
      // For now, simple center dot or small strip
      stripes.drawRoundedRect(-4, -1, 8, 2, 1)
      stripes.endFill()
      // Project to top face: y is offset by -roadHeight/2 roughly in the prism logic
      stripes.y = -roadHeight / 2 // Approximate top surface center
      // roadContainer.addChild(stripes) // Optional: Add later for polish

      tilesContainer.addChild(roadContainer)

      // ===========================
      // 2. Render Attached Land/Building (Side-by-Side)
      // ===========================
      const isSite = config.style === 'site'
      const isProperty = tile.type === TileType.Property

      if ((isSite || isProperty) && config.style !== 'empty' && tile.type !== TileType.Start) {

        const propertyContainer = new PIXI.Container()

        // Offset Calculation
        const OFFSET_DIST = isSite ? 70 : 60
        let ox = 0
        let oy = 0

        // Determine Offset based on direction
        // Default to 'up' (Top-Right on screen) if not specified
        const direction = config.buildingDirection || 'up'
        switch (direction) {
          case 'up': // Screen Top-Right
            ox = OFFSET_DIST
            oy = -OFFSET_DIST * 0.5
            break
          case 'right': // Screen Bottom-Right
            ox = OFFSET_DIST
            oy = OFFSET_DIST * 0.5
            break
          case 'down': // Screen Bottom-Left
            ox = -OFFSET_DIST
            oy = OFFSET_DIST * 0.5
            break
          case 'left': // Screen Top-Left
            ox = -OFFSET_DIST
            oy = -OFFSET_DIST * 0.5
            break
        }

        const landX = posX + ox
        const landY = posY + oy

        propertyContainer.x = landX
        propertyContainer.y = landY
        propertyContainer.zIndex = landY // Sort by actual land position

        // A. Land Base (Grass/Plot)
        const landWidth = isSite ? TILE_WIDTH * 1.3 : TILE_WIDTH * 1.0
        const landHeight = isSite ? TILE_HEIGHT * 1.3 : TILE_HEIGHT * 1.0
        const landThickness = 12

        const landCols: IsoFaceColors = {
          top: 0x4caf50, // Grass Green base
          left: 0x388e3c,
          right: 0x2e7d32,
          stroke: 0x66bb6a
        }

        // Special color for sites
        if (isSite) {
          const uiColor = getTileColor(tile.type)
          landCols.top = lighten(uiColor, 0.2) // Lighter platform
          landCols.left = darken(uiColor, 0.2)
          landCols.right = darken(uiColor, 0.1)
          landCols.stroke = lighten(uiColor, 0.4)
        }

        const landBase = createIsoPrism(landWidth, landHeight, landThickness, landCols, 'down')
        // Adjust landBase Y so its top surface aligns roughly with road or slightly above
        // Road top is at roughly (0, -roadHeight/2).
        // We want land to be "ground level".
        landBase.y = landThickness
        propertyContainer.addChild(landBase)

        // B. Building / Facility
        if (isProperty && tile.propertyData) {
          const { level, ownerId, region } = tile.propertyData
          const bScale = tile.propertyData.visualScale || 1
          const bWidth = TILE_WIDTH * 0.7 * bScale
          const bHeight = TILE_HEIGHT * 0.7 * bScale
          const bThickness = 20 + level * 15

          const regionColor = getRegionColor(region)
          const bCols: IsoFaceColors = {
            top: lighten(regionColor, 0.2),
            left: darken(regionColor, 0.2),
            right: darken(regionColor, 0.1),
            stroke: 0xffffff
          }

          const house = createIsoPrism(bWidth, bHeight, bThickness, bCols, 'up')
          house.y = -5 // Sit on top of land
          propertyContainer.addChild(house)

          // Owner Flag / Indicator
          if (ownerId) {
            const ownerIndex = players.findIndex(p => p.id === ownerId)
            if (ownerIndex >= 0) {
              const ownerColor = getPlayerColor(ownerIndex)
              const flag = new PIXI.Graphics()
              flag.beginFill(ownerColor)
              flag.drawCircle(0, -bThickness - 20, 6)
              flag.endFill()
              flag.lineStyle(1, 0xffffff)
              flag.moveTo(0, -bThickness)
              flag.lineTo(0, -bThickness - 20)
              propertyContainer.addChild(flag)
            }
          }

          // Label (Price/Level or Name)
          // Only show name if space allows, or level
          // For properties, maybe just show nothing or level?
          // User wants "Location names ... in the road adjacent land"
          // Let's show the name on the land base if space
          const propName = new PIXI.Text(tile.name, {
            fontSize: 10,
            fill: 0xffffff,
            fontWeight: 'bold',
            stroke: 0x000000,
            strokeThickness: 2
          })
          propName.anchor.set(0.5)
          propName.y = 15 // Front of the building
          propertyContainer.addChild(propName)

        } else if (isSite) {
          // Site Building (Larger)
          const siteWidth = landWidth * 0.7
          const siteHeight = landHeight * 0.7
          const siteThickness = 40

          const uiColor = getTileColor(tile.type)
          const sCols: IsoFaceColors = {
            top: uiColor,
            left: darken(uiColor, 0.3),
            right: darken(uiColor, 0.15),
            stroke: lighten(uiColor, 0.4)
          }

          const siteBldg = createIsoPrism(siteWidth, siteHeight, siteThickness, sCols, 'up')
          siteBldg.y = -5
          propertyContainer.addChild(siteBldg)

          // Label
          const label = new PIXI.Text(tile.name, {
            fontSize: 14,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            fill: 'white',
            stroke: 0x000000,
            strokeThickness: 4
          })
          label.anchor.set(0.5)
          label.y = -siteThickness - 10
          propertyContainer.addChild(label)
        }

        tilesContainer.addChild(propertyContainer)
      }

      // If it's a plain road (no property attached), do we show the name?
      // User said: "地点的名字不应该写在道路上，而是在道路旁边的土地本身"
      // If there is NO land (just a road tile), maybe we don't show the name, or we show a small signpost?
      // For now, if renderConfig.style is just 'road' (and not Start/Site), we skip name on road.
      // But we might need a small signpost for "Start"?
      if (tile.type === TileType.Start) {
        // Start usually has a structure too
        const startContainer = new PIXI.Container()
        startContainer.x = posX
        startContainer.y = posY
        startContainer.zIndex = posY

        // Simple "Start" Arch or floating text
        const label = new PIXI.Text("START", {
          fontSize: 16,
          fontWeight: 'bold',
          fill: 0xffff00,
          stroke: 0x000000,
          strokeThickness: 3
        })
        label.anchor.set(0.5)
        label.y = -40
        startContainer.addChild(label)
        tilesContainer.addChild(startContainer)
      }
    })
  }, [tiles, players, turnState])

  const getPlayerAnchor = useCallback(
    (tileIndex: number, playerIndex: number) => {
      const tile = tiles[tileIndex]
      if (!tile) return { x: 0, y: 0 }
      const offsetX = (playerIndex % 2) * 16 - 8
      const offsetY = Math.floor(playerIndex / 2) * 12
      // tile.position is absolute world coord
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

      // Shadow
      const shadow = new PIXI.Graphics()
      shadow.beginFill(0x000000, 0.2)
      shadow.drawEllipse(0, 0, PLAYER_SIZE * 0.5, PLAYER_SIZE * 0.25)
      shadow.endFill()
      shadow.filters = [new PIXI.filters.BlurFilter(2)]
      sprite.addChild(shadow)

      // Character Pawn (Pseudo-3D)
      const pawn = new PIXI.Container()

      // 1. Body
      const bodyWidth = 16
      const bodyHeight = 16
      const bodyDepth = 18
      const bodyCols: IsoFaceColors = {
        top: lighten(color, 0.1),
        left: darken(color, 0.1),
        right: darken(color, 0.2),
        stroke: darken(color, 0.3)
      }
      const body = createIsoPrism(bodyWidth, bodyHeight, bodyDepth, bodyCols, 'up')
      body.y = -5 // Lift slightly
      pawn.addChild(body)

      // 2. Head
      const headSize = 12
      const headDepth = 12
      const skinColor = 0xffccaa // Generic skin tone
      const headCols: IsoFaceColors = {
        top: lighten(skinColor, 0.1),
        left: darken(skinColor, 0.05),
        right: darken(skinColor, 0.1),
        stroke: darken(skinColor, 0.2)
      }
      const head = createIsoPrism(headSize, headSize, headDepth, headCols, 'up')
      head.y = -bodyDepth - 5 // Sit on top of body
      pawn.addChild(head)

      // 3. Simple Face (Eyes) - Direction hint
      // Assuming facing "down-right" or "down-left" usually
      const eye = new PIXI.Graphics()
      eye.beginFill(0x000000, 0.7)
      eye.drawCircle(3, -bodyDepth - 5 - 5, 1.5) // Right eye
      eye.drawCircle(-1, -bodyDepth - 5 - 4, 1.5) // Left eye
      eye.endFill()
      // Adjust eye position to match isometric "front" face roughly
      // Prisms are drawn with top/left/right faces.
      // Front is arguably the edge between left and right.
      pawn.addChild(eye)

      // 4. Number Badge (Floating above or on body)
      // Let's put it on the body front or floating high
      const numberText = new PIXI.Text(`${index + 1}`, {
        fontSize: 10,
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: 0x000000,
        strokeThickness: 2
      })
      numberText.anchor.set(0.5)
      numberText.y = -35 // Above head
      pawn.addChild(numberText)

      // Active player highlight ring
      if (index === currentPlayerIndex) {
        // Animate or just show a marker
        const marker = new PIXI.Graphics()
        marker.beginFill(0xffffff, 0.0) // Transparent fill
        marker.lineStyle(2, 0xffff00, 0.8)
        // Draw ring around base
        marker.drawEllipse(0, 0, 18, 10)
        marker.y = 0
        sprite.addChildAt(marker, 0) // Below pawn, above shadow
      }

      sprite.addChild(pawn)
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

    // Allow camera to focus on current player during their turn phases
    if (
      turnState === TurnState.WaitingForDice ||
      turnState === TurnState.OnTile ||
      turnState === TurnState.ChoosingDirection
    ) {
      const player = players[currentPlayerIndex]
      if (player && tiles[player.currentTileIndex]) {
        const anchor = getPlayerAnchor(player.currentTileIndex, currentPlayerIndex)
        cameraTargetRef.current.x = anchor.x
        cameraTargetRef.current.y = anchor.y - TILE_HEIGHT * 0.2 // Slight offset up
        cameraTargetRef.current.zoom = CAMERA_MOVE_ZOOM // Zoom in a bit for focus
        return
      }
    }

    // Default to board center for other states or if no player found
    cameraTargetRef.current.x = boardCenterRef.current.x
    cameraTargetRef.current.y = boardCenterRef.current.y
    cameraTargetRef.current.zoom = CAMERA_IDLE_ZOOM
  }, [turnState, currentPlayerIndex, players, tiles, getPlayerAnchor])

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
      const hasPendingMove = !!useGameStore.getState().pendingMove
      setTurnState(hasPendingMove ? TurnState.ChoosingDirection : TurnState.OnTile)
    }

    playAnimation()
  }, [currentAction, animateMovement, animateTeleport, animateSpecialTeleport, completeAction, setTurnState])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '0', // Fullscreen (or docked) doesn't need radius usually
        overflow: 'hidden',
        // boxShadow removal since it's full layer
      }}
    />
  )
}
