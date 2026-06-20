import * as path from 'path'
import type { DownloadJob } from '../../../shared/types'

/** All filename templates understood by the app. */
export const FILENAME_TEMPLATES = ['artist-title', 'title-artist', 'title'] as const

// Per-component byte budget. Two components + " - " + ".mp3" + a " (99)" dedup
// suffix stay comfortably under the common 255-byte filename limit.
const MAX_COMPONENT_BYTES = 120

/**
 * Truncate to at most `maxBytes` UTF-8 bytes without splitting a multibyte
 * character. A non-ASCII char (e.g. CJK = 3 bytes) counts for its real byte cost,
 * so 200 such chars don't blow past the filesystem's 255-byte limit.
 */
export function truncateBytes(s: string, maxBytes: number): string {
  const buf = Buffer.from(s, 'utf8')
  if (buf.length <= maxBytes) return s
  // toString() emits U+FFFD for a trailing partial char; drop it.
  return buf.subarray(0, maxBytes).toString('utf8').replace(/�+$/, '')
}

/** Strip characters that are illegal or unsafe in filenames across platforms. */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.{2,}/g, '.')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
  return truncateBytes(cleaned, MAX_COMPONENT_BYTES)
}

/** Resolve `filename` inside `outputDir`, rejecting any path-traversal attempt. */
export function assertInsideOutputDir(outputDir: string, filename: string): string {
  const base = path.resolve(outputDir)
  const resolved = path.resolve(base, filename)
  // Path traversal guard
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal detected: ${resolved}`)
  }
  return resolved
}

/**
 * Build the `.mp3` filename for a track under the given template.
 * Single source of truth — reused by the downloader, the dedup logic, and the
 * manifest's existence check, so a template change ripples everywhere.
 */
export function buildFilename(track: DownloadJob['track'], template: string): string {
  // Fall back to the video ID if a title sanitizes away entirely (e.g. all symbols),
  // so we never produce names like " - .mp3".
  const safeTitle = sanitizeFilename(track.title) || track.videoId
  const safeArtist = sanitizeFilename(track.artist)

  // With no usable artist, drop the "artist - " prefix rather than emit a leading " - ".
  if (!safeArtist) return `${safeTitle}.mp3`

  switch (template) {
    case 'title-artist':
      return `${safeTitle} - ${safeArtist}.mp3`
    case 'title':
      return `${safeTitle}.mp3`
    case 'artist-title':
    default:
      return `${safeArtist} - ${safeTitle}.mp3`
  }
}
