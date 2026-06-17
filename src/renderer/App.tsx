import React from 'react'
import { NavBar, type Page } from './components/NavBar'
import { DisclaimerModal } from './components/DisclaimerModal'
import { ImportPage } from './pages/Import'
import { LibraryPage } from './pages/Library'
import { DownloadsPage } from './pages/Downloads'
import { SettingsPage } from './pages/Settings'
import { ipc } from './lib/ipc'
import type { Track, DownloadJob, Settings } from '../../shared/types'

export default function App() {
  const [page, setPage] = React.useState<Page>('import')
  const [disclaimerChecked, setDisclaimerChecked] = React.useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = React.useState(false)
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [jobs, setJobs] = React.useState<DownloadJob[]>([])
  const [settings, setSettings] = React.useState<Settings | null>(null)

  React.useEffect(() => {
    async function init() {
      const [status, s] = await Promise.all([ipc.disclaimer.status(), ipc.settings.get()])
      setDisclaimerAccepted(status.accepted)
      setDisclaimerChecked(true)
      setSettings(s)
    }
    init()
  }, [])

  function handleImported(imported: Track[]) {
    setTracks((prev) => {
      const existing = new Set(prev.map((t) => t.videoId))
      const newTracks = imported.filter((t) => !existing.has(t.videoId))
      return [...prev, ...newTracks]
    })
    setPage('library')
  }

  async function handleStartDownload(newJobs: DownloadJob[], outputDir: string) {
    if (!settings) return
    setJobs((prev) => [...prev, ...newJobs])
    setPage('downloads')

    await ipc.download.start({
      jobs: newJobs,
      outputDir,
      bitrate: settings.bitrate,
      filenameTemplate: settings.filenameTemplate,
    })
  }

  function handleJobsUpdate(updater: (jobs: DownloadJob[]) => DownloadJob[]) {
    setJobs(updater)
  }

  if (!disclaimerChecked || !settings) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {disclaimerChecked && !disclaimerAccepted && (
        <DisclaimerModal onAccepted={() => setDisclaimerAccepted(true)} />
      )}

      <NavBar
        page={page}
        onChange={setPage}
        trackCount={tracks.length}
        downloadCount={jobs.filter((j) => j.status !== 'done' && j.status !== 'cancelled').length}
      />

      <main className="flex-1 overflow-hidden">
        {page === 'import' && <ImportPage onImported={handleImported} />}
        {page === 'library' && (
          <LibraryPage tracks={tracks} onStartDownload={handleStartDownload} />
        )}
        {page === 'downloads' && (
          <DownloadsPage jobs={jobs} onJobsUpdate={handleJobsUpdate} />
        )}
        {page === 'settings' && (
          <SettingsPage settings={settings} onSaved={setSettings} />
        )}
      </main>
    </div>
  )
}
