import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { resolveOutputPath, type DownloadOptions } from './downloader'
import type { DownloadJob } from '../../../shared/types'

function makeJob(title: string, artist: string): DownloadJob {
  return {
    id: 'job',
    track: { videoId: 'dQw4w9WgXcQ', title, artist, isMusicVideo: false },
    status: 'pending',
    progress: 0,
    attempt: 0,
  }
}

let dir: string
let opts: DownloadOptions

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mixtape-dl-'))
  opts = { outputDir: dir, bitrate: 256, filenameTemplate: 'artist-title' }
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('resolveOutputPath', () => {
  it('suffixes distinct jobs that map to the same filename', () => {
    const taken = new Set<string>()
    const a = resolveOutputPath(makeJob('Song', 'Artist'), opts, taken)
    const b = resolveOutputPath(makeJob('Song', 'Artist'), opts, taken)

    expect(path.basename(a)).toBe('Artist - Song.mp3')
    expect(path.basename(b)).toBe('Artist - Song (2).mp3')
  })

  it('avoids overwriting a file that already exists on disk', () => {
    fs.writeFileSync(path.join(dir, 'Artist - Song.mp3'), '')
    const resolved = resolveOutputPath(makeJob('Song', 'Artist'), opts, new Set())
    expect(path.basename(resolved)).toBe('Artist - Song (2).mp3')
  })
})
