import type { Track, ImportResult, Browser } from '../../../shared/types'
import { VideoIdSchema } from '../../../shared/types'
import { TOPIC_CHANNEL_RE, cleanArtist, runYtDlpJson } from './yt-dlp'

// YT Music "Liked Songs" = YouTube "Liked Videos" playlist
const LIKED_SONGS_URL = 'https://www.youtube.com/playlist?list=LL'

export async function fetchLibraryFromCookies(browser: Browser): Promise<ImportResult> {
  const tracks: Track[] = []
  const errors: string[] = []

  const entries = await runYtDlpJson(
    [
      '--cookies-from-browser', browser,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--quiet',
      LIKED_SONGS_URL,
    ],
    5 * 60 * 1000,
    'Library fetch timed out (5 min)',
  )

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
      artist: cleanArtist(channelName),
      album: entry.album,
      thumbnailUrl: entry.thumbnail,
      isMusicVideo,
    }

    tracks.push(track)
  }

  return { tracks, errors }
}
