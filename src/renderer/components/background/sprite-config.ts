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
  placeholder: string
  w: number
  h: number
}

// `src` fields are filled in once Claude Design assets land in assets/sprites/.
export const SPRITES: readonly SpriteKind[] = [
  { id: 'ipod-classic', placeholder: '🎧', w: 48, h: 64 },
  { id: 'ipod-mini', placeholder: '🎵', w: 44, h: 60 },
  { id: 'ipod-nano', placeholder: '🎶', w: 36, h: 60 },
  { id: 'walkman-cassette', placeholder: '📻', w: 72, h: 56 },
  { id: 'walkman-cd', placeholder: '💿', w: 64, h: 64 },
  { id: 'zine-1', placeholder: '📄', w: 56, h: 72 },
  { id: 'zine-2', placeholder: '📰', w: 56, h: 72 },
] as const
