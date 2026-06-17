import { describe, it, expect } from 'vitest'
import {
  VideoIdSchema,
  TrackSchema,
  SettingsSchema,
  ProgressEventSchema,
  DownloadJobSchema,
  DISCLAIMER_VERSION,
} from './types'

describe('VideoIdSchema', () => {
  it('accepts valid 11-char IDs', () => {
    expect(VideoIdSchema.safeParse('dQw4w9WgXcQ').success).toBe(true)
    expect(VideoIdSchema.safeParse('_abcDEFG012').success).toBe(true)
  })

  it('rejects short/long/invalid IDs', () => {
    expect(VideoIdSchema.safeParse('short').success).toBe(false)
    expect(VideoIdSchema.safeParse('toolongid123').success).toBe(false)
    expect(VideoIdSchema.safeParse('has space!!').success).toBe(false)
  })
})

describe('TrackSchema', () => {
  it('parses a minimal track', () => {
    const result = TrackSchema.safeParse({ videoId: 'dQw4w9WgXcQ', title: 'Test', artist: 'Artist' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isMusicVideo).toBe(false)
    }
  })

  it('rejects invalid video IDs in track', () => {
    expect(TrackSchema.safeParse({ videoId: 'bad', title: 'T', artist: 'A' }).success).toBe(false)
  })
})

describe('SettingsSchema', () => {
  it('provides defaults', () => {
    const s = SettingsSchema.parse({})
    expect(s.bitrate).toBe(256)
    expect(s.concurrency).toBe(3)
    expect(s.filenameTemplate).toBe('artist-title')
    expect(s.disclaimerAccepted).toBe(false)
  })

  it('clamps bitrate to valid range', () => {
    expect(() => SettingsSchema.parse({ bitrate: 64 })).toThrow()
    expect(() => SettingsSchema.parse({ bitrate: 512 })).toThrow()
    expect(SettingsSchema.parse({ bitrate: 128 }).bitrate).toBe(128)
  })
})

describe('ProgressEventSchema', () => {
  it('validates a downloading event', () => {
    const result = ProgressEventSchema.safeParse({
      jobId: 'abc',
      percent: 42.5,
      status: 'downloading',
    })
    expect(result.success).toBe(true)
  })

  it('rejects out-of-range percent', () => {
    expect(ProgressEventSchema.safeParse({ jobId: 'x', percent: 101, status: 'done' }).success).toBe(false)
    expect(ProgressEventSchema.safeParse({ jobId: 'x', percent: -1, status: 'done' }).success).toBe(false)
  })
})

describe('DownloadJobSchema', () => {
  it('parses a pending job', () => {
    const result = DownloadJobSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      track: { videoId: 'dQw4w9WgXcQ', title: 'Test', artist: 'A' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('pending')
    }
  })
})

describe('DISCLAIMER_VERSION', () => {
  it('is a non-empty string', () => {
    expect(typeof DISCLAIMER_VERSION).toBe('string')
    expect(DISCLAIMER_VERSION.length).toBeGreaterThan(0)
  })
})
