# Architecture

## Data flow

```
Import (Takeout CSV / browser cookies)
  │
  ├─ takeout-csv.ts   → PapaParse CSV → Track[]
  └─ youtube-cookies.ts → yt-dlp --flat-playlist --dump-json → Track[]
  │
  ▼
Library UI (Track[] in React state)
  User selects tracks + output folder → DownloadJob[]
  │
  ▼
IPC boundary (contextBridge / zod-validated)
  │
  ▼
download/queue.ts  (p-queue, concurrency=settings.concurrency)
  │  retry up to 3× with exponential backoff
  ▼
download/downloader.ts  spawns yt-dlp:
  yt-dlp -x --audio-format mp3 --audio-quality {bitrate}k
         --embed-thumbnail --embed-metadata
         --ppa "EmbedThumbnail+ffmpeg_o:-id3v2_version 3"
         --ffmpeg-location {ffmpegPath}
         -o {sanitized output path}
         https://www.youtube.com/watch?v={videoId}
  │
  ├─ stdout → download/progress.ts → ProgressEvent → IPC push → renderer
  └─ on close(0) → outputPath → done ProgressEvent
  │
  ▼
Tagged MP3 file on disk
  Artist - Title.mp3 (ID3v2.3, embedded album art, proper tags)
  │
  ▼
User drags folder → iTunes/Apple Music → syncs to iPod
```

## IPC boundary

The preload script (`src/preload/index.ts`) is the only bridge between renderer and main.
It exposes `window.mixtape` via `contextBridge`. The renderer never touches Node APIs directly.

Every IPC payload is validated with zod in `src/main/ipc.ts` before use.

## Binary resolution

`src/main/binaries.ts` returns the correct path:
- Dev: `<cwd>/resources/bin/{yt-dlp|ffmpeg}`
- Packaged: `process.resourcesPath/bin/{yt-dlp|ffmpeg}`

`electron-builder.yml` ships `resources/bin/` as `extraResources`.

## Security perimeter

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- All IPC inputs: zod-validated
- All child-process args: array form, no `shell: true`
- Video IDs: regex-validated before reaching spawn()
- Output paths: `sanitizeFilename()` + `assertInsideOutputDir()` guard
- Navigation: blocked except same URL; `shell.openExternal` only for validated YT URLs
