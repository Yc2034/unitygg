/**
 * 大富翁4 - Utility Functions
 */

import { Position } from '@/types'

export const BoardMetrics = {
  boardWidth: 900,
  boardHeight: 700,
  tileWidth: 110,
  tileHeight: 64,
  boardVerticalBias: 24,
} as const

export function gridToIso(
  gridX: number,
  gridY: number,
  tileWidth = BoardMetrics.tileWidth,
  tileHeight = BoardMetrics.tileHeight
): Position {
  return {
    x: (gridX - gridY) * (tileWidth / 2),
    y: (gridX + gridY) * (tileHeight / 2),
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Calculate board positions for tiles arranged in a rectangle
 * Board layout: rectangular path around the screen
 */
export function calculateBoardPositions(tileCount: number): Position[] {
  const gridPositions: Position[] = []

  // Calculate tiles per side
  // For 28 tiles: 8 per horizontal side, 6 per vertical side
  const tilesPerHorizontal = 8
  const tilesPerVertical = Math.floor((tileCount - 2 * tilesPerHorizontal) / 2) + 2

  let index = 0
  const gridMaxY = tilesPerVertical - 1
  const gridMaxX = tilesPerHorizontal - 1

  // Bottom row (left to right)
  for (let i = 0; i < tilesPerHorizontal && index < tileCount; i++) {
    gridPositions.push({ x: i, y: gridMaxY })
    index++
  }

  // Right column (bottom to top)
  for (let i = 1; i < tilesPerVertical && index < tileCount; i++) {
    gridPositions.push({ x: gridMaxX, y: gridMaxY - i })
    index++
  }

  // Top row (right to left)
  for (let i = tilesPerHorizontal - 2; i >= 0 && index < tileCount; i--) {
    gridPositions.push({ x: i, y: 0 })
    index++
  }

  // Left column (top to bottom, excluding corners)
  for (let i = tilesPerVertical - 2; i > 0 && index < tileCount; i--) {
    gridPositions.push({ x: 0, y: i })
    index++
  }

  const isoPositions = gridPositions.map((pos) =>
    gridToIso(pos.x, pos.y, BoardMetrics.tileWidth, BoardMetrics.tileHeight)
  )

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  isoPositions.forEach((pos) => {
    minX = Math.min(minX, pos.x)
    maxX = Math.max(maxX, pos.x)
    minY = Math.min(minY, pos.y)
    maxY = Math.max(maxY, pos.y)
  })

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const offsetX = BoardMetrics.boardWidth / 2 - centerX
  const offsetY = BoardMetrics.boardHeight / 2 - centerY + BoardMetrics.boardVerticalBias

  return isoPositions.map((pos) => ({
    x: pos.x + offsetX,
    y: pos.y + offsetY,
  }))
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

/**
 * Ease out quad
 */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t)
}

/**
 * Shuffle an array
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Get random element from array
 */
export function randomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Check if two positions are equal
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Calculate distance between two positions
 */
export function distance(a: Position, b: Position): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Get color for player based on index
 */
export function getPlayerColor(playerIndex: number): number {
  const colors = [
    0xff6b6b, // Red
    0x4ecdc4, // Teal
    0xffe66d, // Yellow
    0x95e1d3, // Mint
  ]
  return colors[playerIndex % colors.length]
}

/**
 * Get color for property region
 */
export function getRegionColor(region: string): number {
  const colors: Record<string, number> = {
    Suburb: 0x8bc34a, // Green
    Downtown: 0x2196f3, // Blue
    Commercial: 0xff9800, // Orange
    Luxury: 0x9c27b0, // Purple
  }
  return colors[region] || 0xcccccc
}

/**
 * Get color for tile type
 */
export function getTileColor(tileType: string): number {
  const colors: Record<string, number> = {
    Start: 0x4caf50, // Green
    Property: 0x8d6e63, // Brown
    Bank: 0xffc107, // Amber
    Shop: 0xe91e63, // Pink
    News: 0x00bcd4, // Cyan
    Lottery: 0xffeb3b, // Yellow
    Hospital: 0xf44336, // Red
    Prison: 0x607d8b, // Blue Grey
    Park: 0x8bc34a, // Light Green
    Tax: 0x9e9e9e, // Grey
    Chance: 0x673ab7, // Deep Purple
    Fate: 0x3f51b5, // Indigo
  }
  return colors[tileType] || 0xcccccc
}
