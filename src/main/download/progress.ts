import type { DownloadStatus, ProgressEvent } from '../../../shared/types'

// [download]  23.5% of 4.72MiB at 1.23MiB/s ETA 00:03
const DOWNLOAD_RE = /\[download\]\s+([\d.]+)%(?:\s+of\s+[\d.]+\S+)?(?:\s+at\s+([\d.]+\S+))?(?:\s+ETA\s+(\S+))?/

// [Merger] Merging formats into "..."
// [EmbedThumbnail] ...
const TRANSCODE_RE = /\[(Merger|EmbedThumbnail|ffmpeg|ExtractAudio)\]/

export function parseProgress(jobId: string, line: string): ProgressEvent | null {
  const downloadMatch = line.match(DOWNLOAD_RE)
  if (downloadMatch) {
    return {
      jobId,
      percent: parseFloat(downloadMatch[1]),
      speed: downloadMatch[2],
      eta: downloadMatch[3],
      status: 'downloading' as DownloadStatus,
    }
  }

  if (TRANSCODE_RE.test(line)) {
    return {
      jobId,
      percent: 99,
      status: 'transcoding' as DownloadStatus,
    }
  }

  return null
}
