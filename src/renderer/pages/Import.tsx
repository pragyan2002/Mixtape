import React from 'react'
import { UploadCloud, Chrome, Globe } from 'lucide-react'
import { Button } from '../components/Button'
import { ipc } from '../lib/ipc'
import type { Track, Browser } from '../../../shared/types'

interface Props {
  onImported: (tracks: Track[]) => void
}

const BROWSERS: { value: Browser; label: string }[] = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'edge', label: 'Edge' },
  { value: 'brave', label: 'Brave' },
  { value: 'safari', label: 'Safari' },
]

export function ImportPage({ onImported }: Props) {
  const [dragging, setDragging] = React.useState(false)
  const [loading, setLoading] = React.useState<'csv' | 'cookies' | null>(null)
  const [browser, setBrowser] = React.useState<Browser>('chrome')
  const [errors, setErrors] = React.useState<string[]>([])

  async function handleFiles(filePaths: string[]) {
    if (!filePaths.length) return
    setLoading('csv')
    setErrors([])
    try {
      const result = await ipc.import.takeout(filePaths)
      if (result.errors.length) setErrors(result.errors)
      if (result.tracks.length) onImported(result.tracks)
    } catch (err) {
      setErrors([String(err)])
    } finally {
      setLoading(null)
    }
  }

  async function handlePickFiles() {
    const files = await ipc.dialog.openFiles()
    handleFiles(files)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
      .filter((f) => f.name.endsWith('.csv'))
      .map((f) => ipc.dialog.getPathForFile(f))
    handleFiles(files)
  }

  async function handleCookies() {
    setLoading('cookies')
    setErrors([])
    try {
      const result = await ipc.import.cookies(browser)
      if (result.errors.length) setErrors(result.errors)
      if (result.tracks.length) onImported(result.tracks)
    } catch (err) {
      setErrors([String(err)])
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-8 py-12">
      <div className="glass rounded-xl px-8 py-6 text-center">
        <h1 className="text-2xl font-bold text-text mb-2">Import Your Music Library</h1>
        <p className="text-text-muted max-w-md">
          Choose how to load your YouTube Music library. Takeout CSV is recommended, no login
          needed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Takeout CSV */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            Option 1: Google Takeout CSV
          </h2>
          <div
            className={[
              'glass relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary/10' : 'border-text/20 hover:border-text/30',
            ].join(' ')}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={loading ? undefined : handlePickFiles}
          >
            <UploadCloud className="mx-auto mb-3 text-text-muted" size={36} />
            <p className="text-text font-medium mb-1">Drop CSV files here</p>
            <p className="text-text-muted text-sm">or click to browse</p>
            {loading === 'csv' && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/80">
                <span className="text-primary font-medium animate-pulse">Parsing…</span>
              </div>
            )}
          </div>
          <p className="glass rounded-lg px-3 py-2 text-text-muted text-xs">
            Go to{' '}
            <span className="text-primary">takeout.google.com</span> → YouTube and YouTube Music
            → Export playlists CSVs.
          </p>
        </div>

        {/* Browser cookies */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
            Option 2: Connect via Browser
          </h2>
          <div className="glass border border-text/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-text-muted">
              <Globe size={20} />
              <span className="text-sm">Reads your browser&apos;s YouTube cookies</span>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Browser</label>
              <select
                value={browser}
                onChange={(e) => setBrowser(e.target.value as Browser)}
                className="w-full bg-surface-2 border border-text/20 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {BROWSERS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              loading={loading === 'cookies'}
              onClick={handleCookies}
            >
              <Chrome size={16} />
              Connect YouTube Music
            </Button>
            <p className="text-text-muted text-xs">
              Make sure you&apos;re logged into YouTube Music in your selected browser. The app reads
              cookies locally, nothing is sent externally.
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="w-full max-w-2xl bg-rose-100 border border-rose-300 rounded-xl p-4">
          <p className="text-rose-700 text-sm font-semibold mb-2">Import issues:</p>
          <ul className="text-rose-600 text-sm space-y-1 max-h-32 overflow-y-auto">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
