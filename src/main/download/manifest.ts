import * as fs from 'fs'
import * as path from 'path'
import type { DownloadJob } from '../../../shared/types'
import { FILENAME_TEMPLATES, buildFilename, assertInsideOutputDir } from './filename'

/**
 * Per-folder download index, kept at `<outputDir>/.mixtape/downloads.json`.
 * Keyed by video ID so "already downloaded?" survives any filename-scheme change.
 */
export interface ManifestEntry {
  filename: string
  title: string
  artist: string
}

export type Manifest = Record<string, ManifestEntry>

const MANIFEST_DIR = '.mixtape'
const MANIFEST_FILE = 'downloads.json'

function manifestPath(outputDir: string): string {
  return path.join(outputDir, MANIFEST_DIR, MANIFEST_FILE)
}

/** Read the manifest for a folder; returns `{}` when absent or unreadable. */
export function readManifest(outputDir: string): Manifest {
  try {
    const raw = fs.readFileSync(manifestPath(outputDir), 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Manifest
    }
  } catch {
    // Missing or malformed manifest → treat as empty.
  }
  return {}
}

function writeManifest(outputDir: string, manifest: Manifest): void {
  const dir = path.join(outputDir, MANIFEST_DIR)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(manifestPath(outputDir), JSON.stringify(manifest, null, 2), 'utf-8')
}

/** Record a completed download so future existence checks match by video ID. */
export function recordDownload(
  outputDir: string,
  videoId: string,
  outputPath: string,
  track: DownloadJob['track'],
): void {
  const manifest = readManifest(outputDir)
  manifest[videoId] = {
    filename: path.basename(outputPath),
    title: track.title,
    artist: track.artist,
  }
  writeManifest(outputDir, manifest)
}

/**
 * Determine whether a song already exists in `outputDir`, independent of the
 * naming scheme it was downloaded under. Order:
 *   1. Manifest hit by video ID whose file is still on disk.
 *   2. Probe disk under every template, with the real artist AND the legacy
 *      `Unknown Artist` form. An unambiguous hit is back-filled into the manifest
 *      (self-healing migration); a file already owned by another video is skipped.
 * Returns the absolute path of the existing file, or `null`.
 */
export function findExisting(outputDir: string, job: DownloadJob): string | null {
  const manifest = readManifest(outputDir)

  const recorded = manifest[job.track.videoId]
  if (recorded) {
    const recordedPath = path.join(outputDir, recorded.filename)
    if (fs.existsSync(recordedPath)) return recordedPath
  }

  // Candidate names under every template, with the real artist AND the legacy
  // `Unknown Artist` scheme, so old downloads made under any template are matched.
  const candidates = new Set<string>()
  for (const t of FILENAME_TEMPLATES) {
    candidates.add(buildFilename(job.track, t))
    candidates.add(buildFilename({ ...job.track, artist: 'Unknown Artist' }, t))
  }

  for (const filename of candidates) {
    const candidatePath = assertInsideOutputDir(outputDir, filename)
    if (!fs.existsSync(candidatePath)) continue

    // A filename-only match is ambiguous: if another video already owns this exact
    // file, it belongs to a different track — don't claim it (let this one download
    // with a numbered suffix) and don't corrupt the manifest.
    const claimedByOther = Object.entries(manifest).some(
      ([vid, entry]) => vid !== job.track.videoId && entry.filename === filename,
    )
    if (claimedByOther) continue

    // Back-fill so subsequent checks resolve by video ID directly.
    recordDownload(outputDir, job.track.videoId, candidatePath, job.track)
    return candidatePath
  }

  return null
}
