import PQueue from 'p-queue'
import type { Track, ImportResult } from '../../../shared/types'
import { VideoIdSchema } from '../../../shared/types'
import { TOPIC_CHANNEL_RE, runYtDlpJson, type YtDlpEntry } from './yt-dlp'

/** Metadata for one song to be matched against YouTube. */
export interface TrackQuery {
  title: string
  artist: string
  album?: string
  durationMs?: number
  thumbnailUrl?: string
}

/** Progress callback shape: how many queries have been resolved so far. */
export type ResolveProgress = (done: number, total: number) => void

// How many search results to fetch per query before choosing the best one.
const SEARCH_RESULTS = 3
const SEARCH_TIMEOUT_MS = 60 * 1000

/** A non-empty https URL, or undefined — keeps `Track.thumbnailUrl` schema-valid. */
function safeThumbnail(url?: string): string | undefined {
  return url && /^https?:\/\//.test(url) ? url : undefined
}

/**
 * Choose the best search result for a query. With a known duration we prefer the
 * candidate whose length is closest (the surest signal that it's the same song);
 * otherwise we take YouTube's top hit. Entries without a valid video ID are ignored.
 */
export function pickBestEntry(entries: YtDlpEntry[], durationMs?: number): YtDlpEntry | null {
  const valid = entries.filter((e) => e.id && VideoIdSchema.safeParse(e.id).success)
  if (valid.length === 0) return null

  if (durationMs && durationMs > 0) {
    const targetSec = durationMs / 1000
    const withDuration = valid.filter((e) => typeof e.duration === 'number')
    if (withDuration.length > 0) {
      return withDuration.reduce((best, e) =>
        Math.abs((e.duration as number) - targetSec) <
        Math.abs((best.duration as number) - targetSec)
          ? e
          : best,
      )
    }
  }

  return valid[0]
}

/** Turn a chosen yt-dlp entry into a Track, keeping the clean Spotify metadata. */
export function buildTrackFromEntry(query: TrackQuery, entry: YtDlpEntry): Track | null {
  const parsed = VideoIdSchema.safeParse(entry.id)
  if (!parsed.success) return null

  const channelName = entry.uploader ?? entry.channel ?? ''
  return {
    videoId: parsed.data,
    title: query.title,
    artist: query.artist || 'Unknown Artist',
    album: query.album,
    thumbnailUrl: safeThumbnail(query.thumbnailUrl ?? entry.thumbnail),
    isMusicVideo: !TOPIC_CHANNEL_RE.test(channelName),
  }
}

function searchTerm(query: TrackQuery): string {
  return `ytsearch${SEARCH_RESULTS}:${query.artist} ${query.title}`.trim()
}

/** Search YouTube for one query and return the parsed result entries. */
async function searchYouTube(query: TrackQuery): Promise<YtDlpEntry[]> {
  return runYtDlpJson(
    [
      searchTerm(query),
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--quiet',
    ],
    SEARCH_TIMEOUT_MS,
    `YouTube search timed out for "${query.artist} - ${query.title}"`,
  )
}

/**
 * Resolve each Spotify track to a matching YouTube video, in parallel. Every
 * returned Track carries a real videoId, so it flows through the existing
 * download pipeline unchanged. Unmatched or failed queries become `errors`.
 */
export async function resolveTracks(
  queries: TrackQuery[],
  concurrency: number,
  onProgress?: ResolveProgress,
): Promise<ImportResult> {
  const tracks: Track[] = []
  const errors: string[] = []
  const queue = new PQueue({ concurrency: Math.max(1, concurrency) })

  let done = 0
  const total = queries.length

  await Promise.all(
    queries.map((query) =>
      queue.add(async () => {
        const label = `${query.artist} - ${query.title}`.trim()
        try {
          const entries = await searchYouTube(query)
          const best = pickBestEntry(entries, query.durationMs)
          const track = best && buildTrackFromEntry(query, best)
          if (track) {
            tracks.push(track)
          } else {
            errors.push(`No YouTube match for "${label}"`)
          }
        } catch (err) {
          errors.push(`Search failed for "${label}": ${err}`)
        } finally {
          done += 1
          onProgress?.(done, total)
        }
      }),
    ),
  )

  return { tracks, errors }
}
