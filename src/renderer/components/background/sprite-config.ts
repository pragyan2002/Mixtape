import ipodClassic1x from '../../../../assets/sprites/ipod_1x.png'
import ipodClassic2x from '../../../../assets/sprites/ipod_2x.png'
import walkmanCassette1x from '../../../../assets/sprites/walkman-1x.png'
import walkmanCassette2x from '../../../../assets/sprites/walkman-2x.png'

// Tunable ambient-motion constants. Edit freely without touching engine code.
export const SPRITE_COUNT = 4
export const SPAWN_INTERVAL_MS = 8000
export const DRIFT_DURATION_RANGE: readonly [number, number] = [30000, 60000]
export const SKY_BAND: readonly [number, number] = [0.05, 0.55]
export const SCALE_RANGE: readonly [number, number] = [1, 2]
export const BOB_PX_RANGE: readonly [number, number] = [8, 20]

export interface SpriteKind {
  id: string
  /** Real pixel-art asset path. Until generated, SpriteField falls back to `placeholder`. */
  src?: string
  srcSet?: string
  placeholder: string
  w: number
  h: number
}

// Only ipod-classic and walkman-cassette have generated art so far (assets/sprites/).
// The rest stay on emoji placeholders until art lands for them.
export const SPRITES: readonly SpriteKind[] = [
  {
    id: 'ipod-classic',
    src: ipodClassic1x,
    srcSet: `${ipodClassic1x} 1x, ${ipodClassic2x} 2x`,
    placeholder: '🎧',
    w: 48,
    h: 64,
  },
  { id: 'ipod-mini', placeholder: '🎵', w: 44, h: 60 },
  { id: 'ipod-nano', placeholder: '🎶', w: 36, h: 60 },
  {
    id: 'walkman-cassette',
    src: walkmanCassette1x,
    srcSet: `${walkmanCassette1x} 1x, ${walkmanCassette2x} 2x`,
    placeholder: '📻',
    w: 72,
    h: 56,
  },
  { id: 'walkman-cd', placeholder: '💿', w: 64, h: 64 },
  { id: 'zine-1', placeholder: '📄', w: 56, h: 72 },
  { id: 'zine-2', placeholder: '📰', w: 56, h: 72 },
] as const
