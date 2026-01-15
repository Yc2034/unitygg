import xiaomeiImg from '@/assets/userimages/xiaomei.png'
import shalaImg from '@/assets/userimages/shala.png'
import beibeiImg from '@/assets/userimages/beibei.png'

export interface CharacterOption {
  id: string
  name: string
  image?: string
}

export const CHARACTER_OPTIONS: CharacterOption[] = [
  { id: 'char1', name: '孙小美', image: xiaomeiImg },
  { id: 'char2', name: '阿土伯', image: shalaImg },
  { id: 'char3', name: '金贝贝', image: beibeiImg },
  { id: 'char4', name: '钱夫人' },
  { id: 'char5', name: '角色5' },
  { id: 'char6', name: '角色6' },
  { id: 'char7', name: '角色7' },
  { id: 'char8', name: '角色8' },
  { id: 'char9', name: '角色9' },
  { id: 'char10', name: '角色10' },
  { id: 'char11', name: '角色11' },
  { id: 'char12', name: '角色12' },
] as const
