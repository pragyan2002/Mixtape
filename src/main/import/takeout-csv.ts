import * as fs from 'fs'
import * as path from 'path'
import Papa from 'papaparse'
import type { Track, ImportResult } from '../../../shared/types'
import { VideoIdSchema } from '../../../shared/types'

const MAX_FILE_SIZE_MB = 50
const MAX_ROWS = 50_000

export function parseTakeoutCsv(filePaths: string[]): ImportResult {
  const tracks: Track[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  for (const filePath of filePaths) {
    try {
      const { tracks: t, errors: e } = parseOneFile(filePath, seen)
      tracks.push(...t)
      errors.push(...e)
    } catch (err) {
      errors.push(`Failed to parse ${path.basename(filePath)}: ${err}`)
    }
  }

  return { tracks, errors }
}

function parseOneFile(filePath: string, seen: Set<string>): ImportResult {
  const tracks: Track[] = []
  const errors: string[] = []

  const stat = fs.statSync(filePath)
  if (stat.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { tracks, errors: [`File too large (>${MAX_FILE_SIZE_MB}MB): ${path.basename(filePath)}`] }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const { data: rows } = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  })

  // Find the header row containing "Video Id" / "Video ID"
  let headerIdx = -1
  let videoIdCol = -1
  let titleCol = -1
  let artistCol = -1

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lower = row.map((c) => c.trim().toLowerCase())
    const vidIdx = lower.findIndex((c) => c === 'video id')
    if (vidIdx !== -1) {
      headerIdx = i
      videoIdCol = vidIdx
      titleCol = lower.findIndex((c) => c.includes('title') && !c.includes('playlist'))
      artistCol = lower.findIndex(
        (c) => c.includes('artist') || c === 'channel' || c.includes('uploader'),
      )
      break
    }
  }

  if (headerIdx === -1) {
    return { tracks, errors: [`No data table found in ${path.basename(filePath)}`] }
  }

  let rowCount = 0
  for (let i = headerIdx + 1; i < rows.length; i++) {
    if (rowCount++ > MAX_ROWS) {
      errors.push(`Truncated after ${MAX_ROWS} rows`)
      break
    }

    const row = rows[i]
    if (!row || !row[videoIdCol]) continue

    const rawId = row[videoIdCol].trim()
    const parsed = VideoIdSchema.safeParse(rawId)
    if (!parsed.success) {
      if (rawId) errors.push(`Row ${i + 1}: invalid video ID "${rawId}"`)
      continue
    }

    const videoId = parsed.data
    if (seen.has(videoId)) continue
    seen.add(videoId)

    const rawTitle = titleCol >= 0 ? row[titleCol]?.trim() : ''
    const title = rawTitle || videoId

    const rawArtist = artistCol >= 0 ? row[artistCol]?.trim() : ''
    const artist = rawArtist || 'Unknown Artist'

    tracks.push({
      videoId,
      title,
      artist,
      isMusicVideo: false,
    })
  }

  return { tracks, errors }
}
