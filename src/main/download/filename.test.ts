import { describe, it, expect } from 'vitest'
import { sanitizeFilename, truncateBytes, buildFilename } from './filename'
import type { DownloadJob } from '../../../shared/types'

function track(title: string, artist: string): DownloadJob['track'] {
  return { videoId: 'dQw4w9WgXcQ', title, artist, isMusicVideo: false }
}

describe('sanitizeFilename', () => {
  it('preserves non-ASCII (CJK / Cyrillic / accented) characters', () => {
    expect(sanitizeFilename('빨간 맛')).toBe('빨간 맛')
    expect(sanitizeFilename('日本国歌')).toBe('日本国歌')
    expect(sanitizeFilename('Пётр')).toBe('Пётр')
    expect(sanitizeFilename('Beyoncé')).toBe('Beyoncé')
  })

  it('still strips filesystem-illegal characters', () => {
    expect(sanitizeFilename('a/b:c*d?')).toBe('abcd')
  })
})

describe('truncateBytes', () => {
  it('truncates a long CJK string to within the byte budget and leaves no replacement char', () => {
    const long = '가'.repeat(300) // 3 bytes each → 900 bytes
    const out = truncateBytes(long, 120)
    expect(Buffer.byteLength(out, 'utf8')).toBeLessThanOrEqual(120)
    expect(out).not.toContain('�')
  })

  it('leaves short strings untouched', () => {
    expect(truncateBytes('hello', 120)).toBe('hello')
  })
})

describe('buildFilename', () => {
  it('keeps the whole filename under the 255-byte limit for long CJK titles', () => {
    const name = buildFilename(track('곡'.repeat(300), '아티스트'.repeat(300)), 'artist-title')
    expect(Buffer.byteLength(name, 'utf8')).toBeLessThanOrEqual(255)
    expect(name).not.toContain('�')
  })

  it('falls back to the video ID when the title sanitizes to empty', () => {
    const name = buildFilename(track('???', 'Artist'), 'artist-title')
    expect(name).toBe('Artist - dQw4w9WgXcQ.mp3')
  })

  it('drops the artist prefix (no leading " - ") when the artist is empty', () => {
    const name = buildFilename(track('Song', '???'), 'artist-title')
    expect(name).toBe('Song.mp3')
  })
})
