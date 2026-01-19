import { TileData, TileType, PropertyRegion, PropertyFacility } from '@/types'

// Helper to create basic road tile
const road = (index: number, name: string): TileData => ({
    index,
    type: TileType.Chance, // Default to chance/road for now if no specific type
    name,
    position: { x: 0, y: 0 },
    renderConfig: { style: 'road', roadType: 'straight' }
})

// Helper to create property tile (Road + Building)
const property = (index: number, name: string, region: PropertyRegion, dir: 'left' | 'right' | 'up' | 'down'): TileData => ({
    index,
    type: TileType.Property,
    name,
    position: { x: 0, y: 0 },
    propertyData: {
        index,
        name,
        basePrice: 2000,
        baseRent: 200,
        region,
        level: 0,
        ownerId: null,
        isMortgaged: false,
        facilityType: PropertyFacility.None,
        resortEnabled: false,
        visualScale: 1
    },
    renderConfig: { style: 'road', buildingDirection: dir }
})

// Helper to create special site (Large building ON the road -> Now adjacent)
const site = (index: number, type: TileType, name: string, dir?: 'left' | 'right' | 'up' | 'down'): TileData => ({
    index,
    type,
    name,
    position: { x: 0, y: 0 },
    renderConfig: { style: 'site', modelScale: 1.5, buildingDirection: dir }
})

// Richman 4 Classic Map Layout (Simplified Loop)
export const RichmanMapLayout: TileData[] = [
    // Top Row (Left to Right) - Buildings UP (North-West in Iso?) Let's define visually: UP = -Y screen
    site(0, TileType.Start, '起点', 'up'),
    property(1, '台北', PropertyRegion.Suburb, 'up'),
    property(2, '基隆', PropertyRegion.Suburb, 'up'),
    road(3, '机会'),
    property(4, '新竹', PropertyRegion.Suburb, 'up'),
    property(5, '桃园', PropertyRegion.Suburb, 'up'),
    site(6, TileType.Hospital, '医院', 'right'), // Corner -> Right side looks better for visual flow? Or keep Up. Let's try Right for top-right corner.

    // Right Column (Top to Bottom) - Buildings RIGHT (East in Iso)
    property(7, '台中', PropertyRegion.Downtown, 'right'),
    property(8, '彰化', PropertyRegion.Downtown, 'right'),
    site(9, TileType.Shop, '道具店', 'right'),
    property(10, '南投', PropertyRegion.Downtown, 'right'),
    property(11, '云林', PropertyRegion.Downtown, 'right'),
    site(12, TileType.Prison, '监狱', 'down'), // Corner -> Bottom Right

    // Bottom Row (Right to Left) - Buildings DOWN (South in Iso)
    property(13, '嘉义', PropertyRegion.Commercial, 'down'),
    property(14, '台南', PropertyRegion.Commercial, 'down'),
    road(15, '命运'),
    property(16, '高雄', PropertyRegion.Commercial, 'down'),
    property(17, '屏东', PropertyRegion.Commercial, 'down'),
    site(18, TileType.Bank, '银行', 'left'), // Corner -> Bottom Left

    // Left Column (Bottom to Top) - Buildings LEFT (West in Iso)
    property(19, '台东', PropertyRegion.Luxury, 'left'),
    property(20, '花莲', PropertyRegion.Luxury, 'left'),
    site(21, TileType.News, '新闻', 'left'),
    property(22, '宜兰', PropertyRegion.Luxury, 'left'),
    property(23, '澎湖', PropertyRegion.Luxury, 'left'),
    // Loop back to 0
]

// Manually defining grid positions for a 8x8 loop
// (0,0) is top-left
const grid: Record<number, { x: number, y: number }> = {}


// Top: (0,0) -> (6,0)
for (let i = 0; i <= 6; i++) grid[i] = { x: i, y: 0 }
// Right: (6,1) -> (6,5)
for (let i = 7; i <= 11; i++) grid[i] = { x: 6, y: i - 6 }
// Bottom: (6,6) -> (0,6) (Reversed order in array logic usually, but let's follow path)
grid[12] = { x: 6, y: 6 } // Corner
for (let i = 13; i <= 17; i++) grid[i] = { x: 5 - (i - 13), y: 6 }
grid[18] = { x: 0, y: 6 } // Corner
// Left: (0,5) -> (0,1)
for (let i = 19; i <= 23; i++) grid[i] = { x: 0, y: 5 - (i - 19) }

export const RichmanMapGrid = grid
