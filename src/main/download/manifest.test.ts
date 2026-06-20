import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { readManifest, recordDownload, findExisting } from './manifest'
import type { DownloadJob } from '../../../shared/types'

function makeJob(videoId: string, title: string, artist: string): DownloadJob {
  return { id: 'job-1', track: { videoId, title, artist, isMusicVideo: false }, status: 'pending', progress: 0, attempt: 0 }
}

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mixtape-manifest-'))
})

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('manifest', () => {
  it('round-trips a recorded download by video ID', () => {
    const job = makeJob('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley')
    const file = path.join(dir, 'Rick Astley - Never Gonna Give You Up.mp3')
    fs.writeFileSync(file, '')
    recordDownload(dir, job.track.videoId, file, job.track)

    const manifest = readManifest(dir)
    expect(manifest[job.track.videoId].filename).toBe('Rick Astley - Never Gonna Give You Up.mp3')
    expect(manifest[job.track.videoId].artist).toBe('Rick Astley')
  })

  it('returns {} for a folder with no manifest', () => {
    expect(readManifest(dir)).toEqual({})
  })

  it('finds a file written under the legacy Unknown Artist name even when the template changed', () => {
    // Old app downloaded this as "Unknown Artist - Title.mp3".
    const legacy = path.join(dir, 'Unknown Artist - Never Gonna Give You Up.mp3')
    fs.writeFileSync(legacy, '')

    // New import now has the real artist + uses the artist-title template.
    const job = makeJob('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley')
    const found = findExisting(dir, job, 'artist-title')

    expect(found).toBe(legacy)
    // And it back-fills the manifest so future lookups resolve by video ID.
    expect(readManifest(dir)[job.track.videoId].filename).toBe(
      'Unknown Artist - Never Gonna Give You Up.mp3',
    )
  })

  it('returns null when the song is not present in any scheme', () => {
    const job = makeJob('9bZkp7q19f0', 'Gangnam Style', 'PSY')
    expect(findExisting(dir, job, 'artist-title')).toBeNull()
  })
})
