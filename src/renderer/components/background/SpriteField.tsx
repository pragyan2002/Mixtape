import React from 'react'
import { usePrefersReducedMotion } from '../../lib/use-prefers-reduced-motion'
import { usePageVisibility } from '../../lib/use-page-visibility'
import {
  SPRITE_COUNT,
  SPAWN_INTERVAL_MS,
  DRIFT_DURATION_RANGE,
  SKY_BAND,
  SCALE_RANGE,
  BOB_PX_RANGE,
  SPRITES,
  type SpriteKind,
} from './sprite-config'

interface ActiveSprite {
  key: number
  kind: SpriteKind
  topPct: number
  leftPct: number
  scale: number
  durationMs: number
  bobPx: number
  direction: 1 | -1
}

let spriteKeySeq = 0

function randomBetween([min, max]: readonly [number, number]): number {
  return min + Math.random() * (max - min)
}

function createSprite(): ActiveSprite {
  spriteKeySeq += 1
  return {
    key: spriteKeySeq,
    kind: SPRITES[Math.floor(Math.random() * SPRITES.length)],
    topPct: randomBetween(SKY_BAND),
    leftPct: Math.random(),
    scale: randomBetween(SCALE_RANGE),
    durationMs: randomBetween(DRIFT_DURATION_RANGE),
    bobPx: randomBetween(BOB_PX_RANGE),
    direction: Math.random() < 0.5 ? 1 : -1,
  }
}

function SpriteVisual({ kind }: { kind: SpriteKind }) {
  if (kind.src) {
    return (
      <img
        src={kind.src}
        srcSet={kind.srcSet}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain [image-rendering:pixelated]"
      />
    )
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-3xl opacity-80">
      {kind.placeholder}
    </div>
  )
}

function StaticSprite({ sprite }: { sprite: ActiveSprite }) {
  return (
    <div
      className="absolute"
      style={{
        top: `${sprite.topPct * 100}%`,
        left: `${sprite.leftPct * 100}%`,
        width: sprite.kind.w * sprite.scale,
        height: sprite.kind.h * sprite.scale,
      }}
    >
      <SpriteVisual kind={sprite.kind} />
    </div>
  )
}

function DriftingSprite({
  sprite,
  onDone,
}: {
  sprite: ActiveSprite
  onDone: (key: number) => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const offscreen = 160
    const vw = window.innerWidth
    const fromX = sprite.direction === 1 ? -offscreen : vw + offscreen
    const toX = sprite.direction === 1 ? vw + offscreen : -offscreen
    const midX = (fromX + toX) / 2

    const animation = el.animate(
      [
        { transform: `translate(${fromX}px, 0px)` },
        { transform: `translate(${midX}px, -${sprite.bobPx}px)`, offset: 0.5 },
        { transform: `translate(${toX}px, 0px)` },
      ],
      { duration: sprite.durationMs, easing: 'ease-in-out', fill: 'forwards' },
    )
    animation.onfinish = () => onDone(sprite.key)
    return () => animation.cancel()
  }, [sprite, onDone])

  return (
    <div
      ref={ref}
      className="absolute will-change-transform"
      style={{
        top: `${sprite.topPct * 100}%`,
        width: sprite.kind.w * sprite.scale,
        height: sprite.kind.h * sprite.scale,
      }}
    >
      <SpriteVisual kind={sprite.kind} />
    </div>
  )
}

export function SpriteField() {
  const reducedMotion = usePrefersReducedMotion()
  const visible = usePageVisibility()
  const [sprites, setSprites] = React.useState<ActiveSprite[]>(() =>
    Array.from({ length: SPRITE_COUNT }, createSprite),
  )

  React.useEffect(() => {
    if (reducedMotion || !visible) return
    const interval = setInterval(() => {
      setSprites((prev) => (prev.length >= SPRITE_COUNT ? prev : [...prev, createSprite()]))
    }, SPAWN_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [reducedMotion, visible])

  const handleDone = React.useCallback((key: number) => {
    setSprites((prev) => prev.filter((s) => s.key !== key))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {sprites.map((sprite) =>
        reducedMotion ? (
          <StaticSprite key={sprite.key} sprite={sprite} />
        ) : (
          <DriftingSprite key={sprite.key} sprite={sprite} onDone={handleDone} />
        ),
      )}
    </div>
  )
}
