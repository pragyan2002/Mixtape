# CLAUDE.md — Mixtape agent entry point

## What this is

Electron + TypeScript desktop app: imports YouTube Music library → downloads MP3 files for iPod.
One-click installer. No cloud services. Bundles yt-dlp + ffmpeg as sidecars.

## Commands

```bash
npm install      # deps + fetch binaries (postinstall runs scripts/fetch-binaries.ts)
npm run dev      # electron-vite dev mode (hot reload)
npm run check    # ← single verify signal: tsc + eslint + vitest
npm run build    # compile only
npm run package  # compile + electron-builder → dist/
```

**`npm run check` is the success signal.** It must pass before any PR merge.

## Architecture (read first)

```
shared/types.ts          ← single source of truth: Track, DownloadJob, Settings, IPC shapes
src/main/index.ts        ← Electron app lifecycle, BrowserWindow, single-instance
src/main/ipc.ts          ← all ipcMain.handle() registrations; validates every payload with zod
src/main/binaries.ts     ← resolves yt-dlp/ffmpeg paths (dev: resources/bin/, packaged: resourcesPath/bin/)
src/main/import/         ← takeout-csv.ts (parse CSV) | youtube-cookies.ts (yt-dlp + browser cookies)
src/main/download/       ← queue.ts (p-queue, concurrency, retry) | downloader.ts (spawn yt-dlp) | progress.ts (parse output)
src/preload/index.ts     ← contextBridge: typed, minimal surface — only way renderer touches Node
src/renderer/            ← React + Tailwind UI
  App.tsx                ← state root, disclaimer check, page routing
  lib/ipc.ts             ← window.mixtape typed wrapper
  pages/                 ← Import, Library, Downloads, Settings
  components/            ← Button, ProgressBar, Badge, NavBar, DisclaimerModal
scripts/fetch-binaries.ts ← postinstall: download yt-dlp + ffmpeg per OS into resources/bin/
```

## IPC channels

All channels validated with zod. Never `shell: true`, never string-concat args.

| Channel | Direction | Payload |
|---|---|---|
| `settings:get/set` | invoke | `Settings` |
| `disclaimer:status/accept/reject` | invoke | — |
| `dialog:openFiles/openFolder` | invoke | — |
| `import:takeout` | invoke | `string[]` filePaths → `ImportResult` |
| `import:cookies` | invoke | `Browser` → `ImportResult` |
| `download:start` | invoke | `{jobs, outputDir, bitrate, filenameTemplate}` |
| `download:cancel` | invoke | `string[]` jobIds |
| `download:progress` | main→renderer push | `ProgressEvent` |

## Security invariants (never break these)

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — never relax
- All IPC inputs validated with zod before use
- `execa`/`spawn` always array args, never `shell: true`
- Video IDs validated `/^[A-Za-z0-9_-]{11}$/` before any command construction
- Output paths: `sanitizeFilename()` + `assertInsideOutputDir()` — no path traversal
- `shell.openExternal` only for validated `https://youtube.com` or `https://music.youtube.com` URLs

## Conventions

- `shared/types.ts` — add any new shared type here; import in both main and renderer
- Small, single-responsibility files
- Strict TypeScript — no `any`, no `@ts-ignore`
- **Never edit `resources/bin/`** — managed by `scripts/fetch-binaries.ts`
- Conventional Commits for messages

## Never edit

- `resources/bin/` — auto-fetched binaries
- `out/` — build output
- `dist/` — installer output
