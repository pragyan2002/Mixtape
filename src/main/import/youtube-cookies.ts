import { spawn } from 'child_process'
import { ytDlpPath } from '../binaries'
import type { Track, ImportResult, Browser } from '../../../shared/types'
import { VideoIdSchema } from '../../../shared/types'

// YT Music "Liked Songs" = YouTube "Liked Videos" playlist
const LIKED_SONGS_URL = 'https://www.youtube.com/playlist?list=LL'

const TOPIC_CHANNEL_RE = /- Topic$/i

interface YtDlpEntry {
  id?: string
  title?: string
  uploader?: string
  channel?: string
  webpage_url?: string
  thumbnail?: string
  album?: string
}

export async function fetchLibraryFromCookies(browser: Browser): Promise<ImportResult> {
  const tracks: Track[] = []
  const errors: string[] = []

  const entries = await runYtDlpFlatPlaylist(LIKED_SONGS_URL, browser)

  for (const entry of entries) {
    if (!entry.id) continue

    const parsed = VideoIdSchema.safeParse(entry.id)
    if (!parsed.success) {
      errors.push(`Skipped invalid ID: ${entry.id}`)
      continue
    }

    const videoId = parsed.data
    const channelName = entry.uploader ?? entry.channel ?? ''
    const isMusicVideo = !TOPIC_CHANNEL_RE.test(channelName)

    const track: Track = {
      videoId,
      title: entry.title ?? videoId,
      artist: channelName.replace(/ - Topic$/i, '').trim() || 'Unknown Artist',
      album: entry.album,
      thumbnailUrl: entry.thumbnail,
      isMusicVideo,
    }

    tracks.push(track)
  }

  return { tracks, errors }
}

async function runYtDlpFlatPlaylist(url: string, browser: Browser): Promise<YtDlpEntry[]> {
  return new Promise((resolve, reject) => {
    const args = [
      '--cookies-from-browser', browser,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--quiet',
      url,
    ]

    const child = spawn(ytDlpPath(), args, {
      env: { ...process.env },
      shell: false,
    })

    const lines: string[] = []
    let stderrBuf = ''

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      lines.push(...text.split('\n').filter((l) => l.trim()))
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString()
    })

    const timer = setTimeout(
      () => {
        child.kill('SIGKILL')
        reject(new Error('Library fetch timed out (5 min)'))
      },
      5 * 60 * 1000,
    )

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 && lines.length === 0) {
        reject(new Error(`yt-dlp exited ${code}: ${stderrBuf.slice(-1000)}`))
        return
      }

      const entries: YtDlpEntry[] = []
      for (const line of lines) {
        try {
          entries.push(JSON.parse(line) as YtDlpEntry)
        } catch {
          // skip malformed lines
        }
      }
      resolve(entries)
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
