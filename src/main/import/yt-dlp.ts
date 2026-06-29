import { spawn } from 'child_process'
import { ytDlpPath, sidecarEnv } from '../binaries'

/** A YT Music "Topic" channel marks an auto-generated, audio-only upload. */
export const TOPIC_CHANNEL_RE = /- Topic$/i

/** Strip the trailing " - Topic" suffix YT Music adds, falling back to a default. */
export function cleanArtist(channelName: string): string {
  return channelName.replace(/ - Topic$/i, '').trim() || 'Unknown Artist'
}

/** Subset of yt-dlp's JSON we consume, shared across import sources. */
export interface YtDlpEntry {
  id?: string
  title?: string
  uploader?: string
  channel?: string
  webpage_url?: string
  thumbnail?: string
  album?: string
  duration?: number
}

/**
 * Spawn yt-dlp with the given args (array only, never a shell string), collect
 * its newline-delimited `--dump-json` stdout, and parse each line into an entry.
 * Malformed lines are skipped. Rejects only when yt-dlp exits non-zero *and*
 * produced no parseable output, so a partial result still resolves.
 */
export function runYtDlpJson(
  args: string[],
  timeoutMs: number,
  timeoutMessage: string,
): Promise<YtDlpEntry[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(ytDlpPath(), args, {
      env: sidecarEnv(),
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

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(timeoutMessage))
    }, timeoutMs)

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
