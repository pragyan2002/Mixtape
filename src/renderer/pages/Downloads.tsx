import React from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  Pause,
  Play,
  RotateCw,
  MinusCircle,
} from 'lucide-react'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { ipc } from '../lib/ipc'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

interface Props {
  jobs: DownloadJob[]
  onJobsUpdate: (updater: (jobs: DownloadJob[]) => DownloadJob[]) => void
}

type StatusFilter = 'all' | 'downloading' | 'pending' | 'done' | 'failed'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'downloading', label: 'Active' },
  { key: 'pending', label: 'Queued' },
  { key: 'done', label: 'Done' },
  { key: 'failed', label: 'Failed' },
]

function jobColor(status: DownloadJob['status']): 'primary' | 'emerald' | 'rose' | 'amber' {
  if (status === 'done') return 'emerald'
  if (status === 'failed') return 'rose'
  if (status === 'transcoding') return 'amber'
  return 'primary'
}

function matchesStatus(status: DownloadJob['status'], filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'downloading':
      return status === 'downloading' || status === 'transcoding' || status === 'retrying'
    case 'pending':
      return status === 'pending'
    case 'done':
      return status === 'done'
    case 'failed':
      return status === 'failed'
  }
}

export function DownloadsPage({ jobs, onJobsUpdate }: Props) {
  const [paused, setPaused] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')

  React.useEffect(() => {
    const off = ipc.download.onProgress((event: ProgressEvent) => {
      onJobsUpdate((prev) =>
        prev.map((j) =>
          j.id === event.jobId
            ? {
                ...j,
                status: event.status,
                progress: event.percent,
                speed: event.speed,
                eta: event.eta,
                error: event.error,
                outputPath: event.outputPath ?? j.outputPath,
              }
            : j,
        ),
      )
    })
    return off
  }, [onJobsUpdate])

  const done = jobs.filter((j) => j.status === 'done').length
  const failed = jobs.filter((j) => j.status === 'failed').length
  const skipped = jobs.filter((j) => j.status === 'skipped').length
  const active = jobs.filter((j) => j.status === 'downloading' || j.status === 'transcoding').length
  const settled = done + failed + skipped
  const overall = jobs.length > 0 ? Math.round((settled / jobs.length) * 100) : 0

  const visibleJobs = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return jobs.filter((j) => {
      if (!matchesStatus(j.status, statusFilter)) return false
      if (!q) return true
      return (
        j.track.title.toLowerCase().includes(q) || j.track.artist.toLowerCase().includes(q)
      )
    })
  }, [jobs, search, statusFilter])

  async function cancelAll() {
    const ids = jobs.filter((j) => j.status === 'pending').map((j) => j.id)
    await ipc.download.cancel(ids)
  }

  async function togglePause() {
    if (paused) {
      await ipc.download.resume()
      setPaused(false)
    } else {
      await ipc.download.pause()
      setPaused(true)
    }
  }

  async function retryFailed() {
    const ids = jobs.filter((j) => j.status === 'failed').map((j) => j.id)
    if (ids.length === 0) return
    const idSet = new Set(ids)
    onJobsUpdate((prev) =>
      prev.map((j) =>
        idSet.has(j.id) ? { ...j, status: 'pending', progress: 0, error: undefined } : j,
      ),
    )
    await ipc.download.retry(ids)
  }

  async function retryOne(id: string) {
    onJobsUpdate((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: 'pending', progress: 0, error: undefined } : j)),
    )
    await ipc.download.retry([id])
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
        <div className="glass rounded-xl px-8 py-6 flex flex-col items-center gap-4">
          <Clock size={48} />
          <p className="text-lg font-medium">No downloads yet</p>
          <p className="text-sm">Select tracks in Library and click Download.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="glass flex items-center gap-4 px-4 py-3 border-b border-text/10 shrink-0">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>
              {done} done · {active} active · {failed} failed
              {skipped > 0 ? ` · ${skipped} skipped` : ''} ·{' '}
              {jobs.length - settled - active} queued
              {paused ? ' · paused' : ''}
            </span>
            <span>{overall}%</span>
          </div>
          <ProgressBar
            value={overall}
            color={failed > 0 ? 'rose' : done + skipped === jobs.length ? 'emerald' : 'primary'}
          />
        </div>
        {failed > 0 && (
          <Button variant="ghost" size="sm" onClick={retryFailed}>
            <RotateCw size={14} />
            Retry failed ({failed})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={togglePause}>
          {paused ? <Play size={14} /> : <Pause size={14} />}
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="ghost" size="sm" onClick={cancelAll}>
          <Ban size={14} />
          Cancel queued
        </Button>
      </div>

      {/* Filter / search toolbar */}
      <div className="glass flex items-center gap-3 px-4 py-2 border-b border-text/10 shrink-0">
        <input
          type="search"
          placeholder="Search downloads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-surface-2 border border-text/20 rounded-lg px-3 py-1.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
        />
        <div className="flex items-center gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                statusFilter === f.key
                  ? 'bg-primary text-white'
                  : 'bg-surface-2 text-text-muted hover:bg-surface-2/70',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div className="glass flex-1 overflow-auto divide-y divide-text/10">
        {visibleJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted py-12">
            <p className="text-sm">No downloads match this filter.</p>
          </div>
        ) : (
          visibleJobs.map((job) => (
            <div key={job.id} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2/30">
              <div className="shrink-0">
                {job.status === 'done' && <CheckCircle2 size={18} className="text-emerald-500" />}
                {job.status === 'failed' && <XCircle size={18} className="text-rose-500" />}
                {(job.status === 'downloading' || job.status === 'transcoding') && (
                  <Loader2 size={18} className="text-primary animate-spin" />
                )}
                {(job.status === 'pending' || job.status === 'retrying') && (
                  <Clock size={18} className="text-text-muted" />
                )}
                {job.status === 'cancelled' && <Ban size={18} className="text-text-muted" />}
                {job.status === 'skipped' && <MinusCircle size={18} className="text-text-muted" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-text font-medium truncate">{job.track.title}</span>
                  <span className="text-xs text-text-muted shrink-0">{job.track.artist}</span>
                </div>
                {(job.status === 'downloading' || job.status === 'transcoding') && (
                  <ProgressBar value={job.progress} color={jobColor(job.status)} className="h-1.5" />
                )}
                {job.error && (
                  <p className="text-xs text-rose-600 mt-0.5 truncate">{job.error}</p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {job.speed && (
                  <span className="text-xs text-text-muted font-mono">{job.speed}</span>
                )}
                {job.eta && (
                  <span className="text-xs text-text-muted font-mono">ETA {job.eta}</span>
                )}
                {job.progress > 0 && job.status !== 'done' && job.status !== 'failed' && (
                  <span className="text-xs text-text-muted font-mono w-10 text-right">
                    {Math.round(job.progress)}%
                  </span>
                )}
                {job.status === 'failed' && (
                  <button
                    onClick={() => retryOne(job.id)}
                    title="Retry this download"
                    className="text-text-muted hover:text-primary transition-colors"
                  >
                    <RotateCw size={15} />
                  </button>
                )}
                <StatusBadge status={job.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
