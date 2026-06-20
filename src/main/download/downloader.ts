import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { ytDlpPath, ffmpegPath, sidecarEnv } from '../binaries'
import { parseProgress } from './progress'
import { buildFilename, assertInsideOutputDir } from './filename'
import { recordDownload } from './manifest'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

export interface DownloadOptions {
  outputDir: string
  bitrate: number
  filenameTemplate: string
}

/**
 * Resolve a unique, traversal-safe output path for a job. If the desired path is
 * already taken in this session (`taken`) or exists on disk, append ` (2)`, ` (3)`…
 * before the extension until free, so distinct songs never overwrite each other.
 * The chosen path is added to `taken`.
 */
export function resolveOutputPath(
  job: DownloadJob,
  opts: DownloadOptions,
  taken: Set<string>,
): string {
  const filename = buildFilename(job.track, opts.filenameTemplate)
  const base = assertInsideOutputDir(opts.outputDir, filename)

  const ext = path.extname(base)
  const stem = base.slice(0, base.length - ext.length)

  // Windows and default macOS volumes are case-insensitive, so two names that
  // differ only by case map to the same file. Key reservations case-folded there
  // (while still returning the original-cased path) to avoid a collision.
  const insensitive = process.platform === 'win32' || process.platform === 'darwin'
  const fold = (p: string): string => (insensitive ? p.toLowerCase() : p)

  let candidate = base
  let n = 2
  while (taken.has(fold(candidate)) || fs.existsSync(candidate)) {
    candidate = `${stem} (${n})${ext}`
    n++
  }

  taken.add(fold(candidate))
  return candidate
}

export async function runDownload(
  job: DownloadJob,
  opts: DownloadOptions,
  outputPath: string,
  onProgress: (event: ProgressEvent) => void,
): Promise<string> {
  const { videoId } = job.track

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error(`Invalid video ID: ${videoId}`)
  }

  fs.mkdirSync(opts.outputDir, { recursive: true })

  const args = [
    `https://www.youtube.com/watch?v=${videoId}`,
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', `${opts.bitrate}k`,
    '--embed-thumbnail',
    '--embed-metadata',
    '--ppa', 'EmbedThumbnail+ffmpeg_o:-id3v2_version 3',
    '--ffmpeg-location', ffmpegPath(),
    '--no-playlist',
    '--no-part',
    '--newline',
    '--progress',
    '-o', outputPath,
  ]

  return new Promise<string>((resolve, reject) => {
    const child = spawn(ytDlpPath(), args, {
      env: sidecarEnv(),
      shell: false,
    })

    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => {
      const line = chunk.toString()
      const event = parseProgress(job.id, line)
      if (event) onProgress(event)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timer = setTimeout(
      () => {
        child.kill('SIGKILL')
        reject(new Error('Download timed out after 10 minutes'))
      },
      10 * 60 * 1000,
    )

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        recordDownload(opts.outputDir, videoId, outputPath, job.track)
        resolve(outputPath)
      } else {
        reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`))
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
