import * as path from 'path'
import type { DownloadJob } from '../../../shared/types'

/** All filename templates understood by the app. */
export const FILENAME_TEMPLATES = ['artist-title', 'title-artist', 'title'] as const

/** Strip characters that are illegal or unsafe in filenames across platforms. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\.{2,}/g, '.')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
    .slice(0, 200)
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
  const safeTitle = sanitizeFilename(track.title)
  const safeArtist = sanitizeFilename(track.artist)
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
