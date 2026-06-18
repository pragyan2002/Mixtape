import React from 'react'
import { FolderOpen, Save } from 'lucide-react'
import { Button } from '../components/Button'
import { ipc } from '../lib/ipc'
import type { Settings } from '../../../shared/types'

interface Props {
  settings: Settings
  onSaved: (s: Settings) => void
}

export function SettingsPage({ settings, onSaved }: Props) {
  const [form, setForm] = React.useState<Settings>(settings)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    setForm(settings)
  }, [settings])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await ipc.settings.set(form)
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handlePickFolder() {
    const folder = await ipc.dialog.openFolder()
    if (folder) update('outputFolder', folder)
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-8">
      <h1 className="text-xl font-bold text-text">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Output</h2>

        <div className="space-y-2">
          <label className="block text-sm text-text">Default output folder</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.outputFolder}
              readOnly
              placeholder="Not set, will prompt on each download"
              className="flex-1 bg-surface-2 border border-text/20 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none cursor-default"
            />
            <button
              onClick={handlePickFolder}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 hover:bg-surface-2/70 border border-text/20 rounded-lg text-sm text-text transition-colors"
            >
              <FolderOpen size={15} />
              Browse
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-text">Filename template</label>
          <select
            value={form.filenameTemplate}
            onChange={(e) => update('filenameTemplate', e.target.value as Settings['filenameTemplate'])}
            className="w-full bg-surface-2 border border-text/20 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
          >
            <option value="artist-title">Artist - Title.mp3</option>
            <option value="title-artist">Title - Artist.mp3</option>
            <option value="title">Title.mp3</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Quality</h2>

        <div className="space-y-2">
          <label className="block text-sm text-text">
            MP3 bitrate: <span className="text-primary font-mono">{form.bitrate} kbps</span>
          </label>
          <input
            type="range"
            min={128}
            max={256}
            step={32}
            value={form.bitrate}
            onChange={(e) => update('bitrate', parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>128 kbps</span>
            <span>192 kbps</span>
            <span>256 kbps (default, max)</span>
          </div>
          <p className="text-xs text-text-muted">
            YouTube Music source tops out at ~256 kbps, so that is the max here too.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Downloads</h2>

        <div className="space-y-2">
          <label className="block text-sm text-text">
            Concurrent downloads:{' '}
            <span className="text-primary font-mono">{form.concurrency}</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={form.concurrency}
            onChange={(e) => update('concurrency', parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>1 (safe)</span>
            <span>3 (default)</span>
            <span>10 (fast)</span>
          </div>
        </div>
      </section>

      <Button onClick={handleSave} loading={saving} variant={saved ? 'secondary' : 'primary'}>
        <Save size={15} />
        {saved ? 'Saved!' : 'Save Settings'}
      </Button>
    </div>
  )
}
