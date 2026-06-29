import { describe, it, expect } from 'vitest'
import { pickBestEntry, buildTrackFromEntry, type TrackQuery } from './youtube-search'
import type { YtDlpEntry } from './yt-dlp'

const QUERY: TrackQuery = { title: 'Blinding Lights', artist: 'The Weeknd' }

describe('pickBestEntry', () => {
  it('returns null when no entry has a valid video id', () => {
    expect(pickBestEntry([{ id: 'too-short' }, { title: 'no id' }])).toBeNull()
  })

  it('takes the first valid entry when no duration is given', () => {
    const entries: YtDlpEntry[] = [
      { id: 'aaaaaaaaaaa', duration: 100 },
      { id: 'bbbbbbbbbbb', duration: 200 },
    ]
    expect(pickBestEntry(entries)?.id).toBe('aaaaaaaaaaa')
  })

  it('prefers the closest-duration candidate when duration is known', () => {
    const entries: YtDlpEntry[] = [
      { id: 'aaaaaaaaaaa', duration: 100 }, // 100s
      { id: 'bbbbbbbbbbb', duration: 200 }, // 200s — closest to 201s target
    ]
    expect(pickBestEntry(entries, 201_000)?.id).toBe('bbbbbbbbbbb')
  })

  it('skips invalid ids when choosing by duration', () => {
    const entries: YtDlpEntry[] = [
      { id: 'bad', duration: 200 },
      { id: 'ccccccccccc', duration: 100 },
    ]
    expect(pickBestEntry(entries, 200_000)?.id).toBe('ccccccccccc')
  })
})

describe('buildTrackFromEntry', () => {
  it('keeps the clean Spotify metadata and a valid video id', () => {
    const track = buildTrackFromEntry(QUERY, {
      id: 'aaaaaaaaaaa',
      channel: 'The Weeknd - Topic',
      thumbnail: 'https://img/yt.jpg',
    })
    expect(track).not.toBeNull()
    expect(track?.videoId).toBe('aaaaaaaaaaa')
    expect(track?.title).toBe('Blinding Lights')
    expect(track?.artist).toBe('The Weeknd')
    expect(track?.isMusicVideo).toBe(false) // "- Topic" => audio upload
  })

  it('marks non-Topic uploads as music videos', () => {
    const track = buildTrackFromEntry(QUERY, { id: 'aaaaaaaaaaa', channel: 'TheWeekndVEVO' })
    expect(track?.isMusicVideo).toBe(true)
  })

  it('prefers Spotify album art, ignoring non-http thumbnails', () => {
    const withArt = buildTrackFromEntry(
      { ...QUERY, thumbnailUrl: 'https://spotify/art.jpg' },
      { id: 'aaaaaaaaaaa', thumbnail: 'https://yt/art.jpg' },
    )
    expect(withArt?.thumbnailUrl).toBe('https://spotify/art.jpg')

    const badThumb = buildTrackFromEntry(QUERY, { id: 'aaaaaaaaaaa', thumbnail: 'notaurl' })
    expect(badThumb?.thumbnailUrl).toBeUndefined()
  })

  it('returns null for an invalid video id', () => {
    expect(buildTrackFromEntry(QUERY, { id: 'bad' })).toBeNull()
  })
})
