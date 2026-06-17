import React from 'react'
import { CheckCircle2, XCircle, Loader2, Clock, Ban } from 'lucide-react'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { ipc } from '../lib/ipc'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

interface Props {
  jobs: DownloadJob[]
  onJobsUpdate: (updater: (jobs: DownloadJob[]) => DownloadJob[]) => void
}

function jobColor(status: DownloadJob['status']): 'violet' | 'emerald' | 'rose' | 'amber' {
  if (status === 'done') return 'emerald'
  if (status === 'failed') return 'rose'
  if (status === 'transcoding') return 'amber'
  return 'violet'
}

export function DownloadsPage({ jobs, onJobsUpdate }: Props) {
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
  const active = jobs.filter((j) => j.status === 'downloading' || j.status === 'transcoding').length
  const overall = jobs.length > 0 ? Math.round(((done + failed) / jobs.length) * 100) : 0

  async function cancelAll() {
    const ids = jobs.filter((j) => j.status === 'pending').map((j) => j.id)
    await ipc.download.cancel(ids)
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <Clock size={48} />
        <p className="text-lg font-medium">No downloads yet</p>
        <p className="text-sm">Select tracks in Library and click Download.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700 bg-slate-900/50 shrink-0">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>
              {done} done · {active} active · {failed} failed · {jobs.length - done - active - failed} queued
            </span>
            <span>{overall}%</span>
          </div>
          <ProgressBar
            value={overall}
            color={failed > 0 ? 'rose' : done === jobs.length ? 'emerald' : 'violet'}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={cancelAll}>
          <Ban size={14} />
          Cancel queued
        </Button>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-auto divide-y divide-slate-800">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/30">
            <div className="shrink-0">
              {job.status === 'done' && <CheckCircle2 size={18} className="text-emerald-400" />}
              {job.status === 'failed' && <XCircle size={18} className="text-rose-400" />}
              {(job.status === 'downloading' || job.status === 'transcoding') && (
                <Loader2 size={18} className="text-violet-400 animate-spin" />
              )}
              {(job.status === 'pending' || job.status === 'retrying') && (
                <Clock size={18} className="text-slate-500" />
              )}
              {job.status === 'cancelled' && <Ban size={18} className="text-slate-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-slate-200 font-medium truncate">{job.track.title}</span>
                <span className="text-xs text-slate-500 shrink-0">{job.track.artist}</span>
              </div>
              {(job.status === 'downloading' || job.status === 'transcoding') && (
                <ProgressBar value={job.progress} color={jobColor(job.status)} className="h-1.5" />
              )}
              {job.error && (
                <p className="text-xs text-rose-400 mt-0.5 truncate">{job.error}</p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-3">
              {job.speed && (
                <span className="text-xs text-slate-500 font-mono">{job.speed}</span>
              )}
              {job.eta && (
                <span className="text-xs text-slate-500 font-mono">ETA {job.eta}</span>
              )}
              {job.progress > 0 && job.status !== 'done' && job.status !== 'failed' && (
                <span className="text-xs text-slate-400 font-mono w-10 text-right">
                  {Math.round(job.progress)}%
                </span>
              )}
              <StatusBadge status={job.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
