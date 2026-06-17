import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { ytDlpPath, ffmpegPath } from '../binaries'
import { parseProgress } from './progress'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.{2,}/g, '.')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 200)
}

function assertInsideOutputDir(outputDir: string, filename: string): string {
  const base = path.resolve(outputDir)
  const resolved = path.resolve(base, filename)
  // Path traversal guard
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal detected: ${resolved}`)
  }
  return resolved
}

function buildFilename(job: DownloadJob, template: string): string {
  const { title, artist } = job.track
  const safeTitle = sanitizeFilename(title)
  const safeArtist = sanitizeFilename(artist)
  switch (template) {
    case 'title-artist':
      return `${safeTitle} - ${safeArtist}.mp3`
    case 'title':
      return `${safeTitle}.mp3`
    case 'artist-title':
    default:
      return `${safeArtist} - ${safeTitle}.mp3`
  }
}

export interface DownloadOptions {
  outputDir: string
  bitrate: number
  filenameTemplate: string
}

export async function runDownload(
  job: DownloadJob,
  opts: DownloadOptions,
  onProgress: (event: ProgressEvent) => void,
): Promise<string> {
  const { videoId } = job.track

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error(`Invalid video ID: ${videoId}`)
  }

  fs.mkdirSync(opts.outputDir, { recursive: true })

  const filename = buildFilename(job, opts.filenameTemplate)
  const outputPath = assertInsideOutputDir(opts.outputDir, filename)

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
      env: { ...process.env },
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
