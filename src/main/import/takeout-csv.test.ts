import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { parseTakeoutCsv } from './takeout-csv'

const TMP = os.tmpdir()

function writeCsv(name: string, content: string): string {
  const p = path.join(TMP, `mixtape-test-${name}.csv`)
  fs.writeFileSync(p, content, 'utf-8')
  return p
}

const SAMPLE_CSV = `Playlist Id,UCxxxxxx
Channel Id,UCxxxxxx
Time Updated,2024-01-01
Title,My Playlist
Description,
Visibility,Private

Video Id,Time Added,Video Title
dQw4w9WgXcQ,2024-01-01T00:00:00+00:00,Never Gonna Give You Up
9bZkp7q19f0,2024-01-02T00:00:00+00:00,Gangnam Style
`

const HEADER_ONLY_CSV = `Video Id,Time Added
`

let samplePath: string
let emptyPath: string

beforeAll(() => {
  samplePath = writeCsv('sample', SAMPLE_CSV)
  emptyPath = writeCsv('empty', HEADER_ONLY_CSV)
})

afterAll(() => {
  fs.unlinkSync(samplePath)
  fs.unlinkSync(emptyPath)
})

describe('parseTakeoutCsv', () => {
  it('parses a standard Takeout CSV', () => {
    const result = parseTakeoutCsv([samplePath])
    expect(result.tracks).toHaveLength(2)
    expect(result.tracks[0].videoId).toBe('dQw4w9WgXcQ')
    expect(result.tracks[0].title).toBe('Never Gonna Give You Up')
    expect(result.tracks[1].videoId).toBe('9bZkp7q19f0')
    expect(result.errors).toHaveLength(0)
  })

  it('deduplicates tracks across multiple files', () => {
    const result = parseTakeoutCsv([samplePath, samplePath])
    expect(result.tracks).toHaveLength(2) // deduped
  })

  it('returns empty tracks for header-only CSV', () => {
    const result = parseTakeoutCsv([emptyPath])
    expect(result.tracks).toHaveLength(0)
  })

  it('handles nonexistent file gracefully', () => {
    const result = parseTakeoutCsv(['/nonexistent/path.csv'])
    expect(result.errors).toHaveLength(1)
    expect(result.tracks).toHaveLength(0)
  })
})
