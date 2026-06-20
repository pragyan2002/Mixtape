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

/**
 * Environment for spawning the yt-dlp/ffmpeg sidecars. Forces UTF-8 so non-ASCII
 * titles/paths (e.g. Korean, Japanese, Cyrillic) work regardless of the system
 * locale the GUI app was launched under. `PYTHONUTF8=1` overrides any LANG/LC_ALL,
 * so we don't hard-code a locale string that may not exist on the user's machine.
 */
export function sidecarEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
}
