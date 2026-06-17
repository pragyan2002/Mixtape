# Mixtape

Download your YouTube Music library as MP3 files and load them onto your iPod.

## What it does

1. Import your library via Google Takeout CSV or browser sign-in
2. Select tracks and an output folder
3. Download tagged MP3 files (ID3v2.3 + embedded art) — iPod-ready

## Dev setup

```bash
npm install          # installs deps + fetches yt-dlp/ffmpeg into resources/bin/
npm run dev          # opens Electron dev window
npm run check        # typecheck + lint + tests
```

## Build

```bash
npm run package      # produces installer in dist/
```

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — data flow, IPC boundary
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why each tech choice was made
- [`CLAUDE.md`](CLAUDE.md) — agent entry point: arch map, conventions, commands
