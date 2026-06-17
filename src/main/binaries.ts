import { app } from 'electron'
import * as path from 'path'

function binDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(process.cwd(), 'resources', 'bin')
}

export function ytDlpPath(): string {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return path.join(binDir(), name)
}

export function ffmpegPath(): string {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  return path.join(binDir(), name)
}
