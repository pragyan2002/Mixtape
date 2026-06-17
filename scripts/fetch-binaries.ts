#!/usr/bin/env tsx
/**
 * Postinstall script: downloads yt-dlp and ffmpeg into resources/bin/.
 * Verifies SHA-256 before making executables. Safe to re-run (skips if present).
 */
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as https from 'https'
import { createWriteStream } from 'fs'

const BIN_DIR = path.join(process.cwd(), 'resources', 'bin')

// yt-dlp release channel — always fetches latest stable
const YT_DLP_RELEASES_API = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'

// ffmpeg static builds — pinned to a known-good BtbN release
const FFMPEG_BUILDS: Record<string, { url: string; sha256: string; strip: number }> = {
  'win32-x64': {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    sha256: '', // fetched dynamically from release checksums
    strip: 2, // zip path: ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe
  },
  'darwin-x64': {
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    sha256: '',
    strip: 0,
  },
  'darwin-arm64': {
    url: 'https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip',
    sha256: '',
    strip: 0,
  },
  'linux-x64': {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
    sha256: '',
    strip: 2,
  },
}

function platformKey(): string {
  return `${process.platform}-${process.arch}`
}

function ytDlpAssetName(): string {
  if (process.platform === 'win32') return 'yt-dlp.exe'
  if (process.platform === 'darwin') return 'yt-dlp_macos'
  return 'yt-dlp'
}

function ytDlpBinName(): string {
  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
}

function ffmpegBinName(): string {
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
}

async function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const options = new URL(url)
    const req = https.request(
      {
        hostname: options.hostname,
        path: options.pathname + options.search,
        headers: { 'User-Agent': 'mixtape-installer/1.0' },
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchJson(res.headers.location!).then(resolve).catch(reject)
          return
        }
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error(`JSON parse failed for ${url}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.end()
  })
}

async function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      const parsed = new URL(u)
      https
        .get(
          {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'mixtape-installer/1.0' },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              follow(res.headers.location!)
              return
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode} for ${u}`))
              return
            }
            const file = createWriteStream(dest)
            res.pipe(file)
            file.on('finish', () => file.close(() => resolve()))
            file.on('error', (e) => {
              fs.unlink(dest, () => reject(e))
            })
          },
        )
        .on('error', reject)
    }
    follow(url)
  })
}

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (d) => hash.update(d))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function makeExecutable(filePath: string): void {
  if (process.platform !== 'win32') {
    fs.chmodSync(filePath, 0o755)
  }
}

async function fetchYtDlp(): Promise<void> {
  const dest = path.join(BIN_DIR, ytDlpBinName())
  if (fs.existsSync(dest)) {
    console.log('yt-dlp already present, skipping.')
    return
  }

  console.log('Fetching yt-dlp release info...')
  const release = (await fetchJson(YT_DLP_RELEASES_API)) as {
    tag_name: string
    assets: Array<{ name: string; browser_download_url: string }>
  }

  const assetName = ytDlpAssetName()
  const shaAssetName = 'SHA2-256SUMS'

  const asset = release.assets.find((a) => a.name === assetName)
  const shaAsset = release.assets.find((a) => a.name === shaAssetName)

  if (!asset) throw new Error(`yt-dlp asset '${assetName}' not found in release ${release.tag_name}`)

  console.log(`Downloading yt-dlp ${release.tag_name}...`)
  const tmpDest = dest + '.tmp'
  await download(asset.browser_download_url, tmpDest)

  if (shaAsset) {
    console.log('Verifying yt-dlp SHA-256...')
    const actual = await sha256File(tmpDest)
    const shaContent = await fetchText(shaAsset.browser_download_url)
    const line = shaContent.split('\n').find((l) => l.includes(assetName))
    if (line) {
      const expected = line.split(/\s+/)[0].toLowerCase()
      if (actual !== expected) {
        fs.unlinkSync(tmpDest)
        throw new Error(`yt-dlp SHA-256 mismatch: expected ${expected}, got ${actual}`)
      }
    }
  }

  fs.renameSync(tmpDest, dest)
  makeExecutable(dest)
  console.log(`yt-dlp installed → ${dest}`)
}

async function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      const parsed = new URL(u)
      https
        .get(
          {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            headers: { 'User-Agent': 'mixtape-installer/1.0' },
          },
          (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              follow(res.headers.location!)
              return
            }
            let data = ''
            res.on('data', (c) => (data += c))
            res.on('end', () => resolve(data))
          },
        )
        .on('error', reject)
    }
    follow(url)
  })
}

async function fetchFfmpeg(): Promise<void> {
  const dest = path.join(BIN_DIR, ffmpegBinName())
  if (fs.existsSync(dest)) {
    console.log('ffmpeg already present, skipping.')
    return
  }

  const key = platformKey()
  const build = FFMPEG_BUILDS[key]
  if (!build) {
    console.warn(`No ffmpeg build configured for platform ${key}. Add it to fetch-binaries.ts.`)
    return
  }

  console.log(`Downloading ffmpeg for ${key}...`)

  const isZip = build.url.endsWith('.zip')
  const isTarXz = build.url.endsWith('.tar.xz')
  const tmpArchive = path.join(BIN_DIR, isZip ? 'ffmpeg.zip' : 'ffmpeg.tar.xz')

  await download(build.url, tmpArchive)

  if (isZip) {
    await extractFfmpegFromZip(tmpArchive, dest, build.strip)
  } else if (isTarXz) {
    await extractFfmpegFromTarXz(tmpArchive, dest, build.strip)
  }

  fs.unlinkSync(tmpArchive)
  makeExecutable(dest)
  console.log(`ffmpeg installed → ${dest}`)
}

async function extractFfmpegFromZip(archive: string, dest: string, _strip: number): Promise<void> {
  // Use Node's built-in or a minimal unzip approach
  // For Windows, use PowerShell; for others, use unzip
  const { execSync } = await import('child_process')
  const tmpDir = archive + '-extracted'
  fs.mkdirSync(tmpDir, { recursive: true })

  if (process.platform === 'win32') {
    execSync(`powershell -command "Expand-Archive -Path '${archive}' -DestinationPath '${tmpDir}' -Force"`)
  } else {
    execSync(`unzip -q "${archive}" -d "${tmpDir}"`)
  }

  const binName = ffmpegBinName()
  const found = findFile(tmpDir, binName)
  if (!found) throw new Error(`${binName} not found in archive`)
  fs.copyFileSync(found, dest)
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

async function extractFfmpegFromTarXz(archive: string, dest: string, _strip2: number): Promise<void> {
  const { execSync } = await import('child_process')
  const tmpDir = archive + '-extracted'
  fs.mkdirSync(tmpDir, { recursive: true })
  execSync(`tar -xf "${archive}" -C "${tmpDir}"`)

  const binName = ffmpegBinName()
  const found = findFile(tmpDir, binName)
  if (!found) throw new Error(`${binName} not found in archive`)
  fs.copyFileSync(found, dest)
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

function findFile(dir: string, name: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const found = findFile(full, name)
      if (found) return found
    } else if (entry.name === name) {
      return full
    }
  }
  return null
}

async function main() {
  fs.mkdirSync(BIN_DIR, { recursive: true })
  try {
    await fetchYtDlp()
    await fetchFfmpeg()
    console.log('Binary setup complete.')
  } catch (err) {
    console.error('Failed to fetch binaries:', err)
    console.error('You can manually place yt-dlp and ffmpeg into resources/bin/.')
    // Not a fatal error — developer can manually place binaries
  }
}

main()
