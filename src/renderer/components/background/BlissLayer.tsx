interface BlissLayerProps {
  /** Generated Bliss PNG. Renders sky-gradient fallback until the asset lands. */
  src?: string
}

export function BlissLayer({ src }: BlissLayerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-sky-top via-sky-mid to-sky-low" />
      {src && (
        <img
          src={src}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
        />
      )}
    </div>
  )
}
