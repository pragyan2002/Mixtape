import PQueue from 'p-queue'
import { runDownload, resolveOutputPath, DownloadOptions } from './downloader'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

const MAX_ATTEMPTS = 3
const BACKOFF_BASE_MS = 2000

export interface QueueController {
  addJobs: (jobs: DownloadJob[], opts: DownloadOptions) => void
  retry: (jobIds: string[]) => void
  cancel: (jobIds: string[]) => void
  pause: () => void
  resume: () => void
  setConcurrency: (n: number) => void
  clear: () => void
}

export function createQueue(
  concurrency: number,
  onProgress: (event: ProgressEvent) => void,
): QueueController {
  const queue = new PQueue({ concurrency })
  const cancelled = new Set<string>()
  // Output paths reserved this session so distinct songs never collide on disk.
  const usedPaths = new Set<string>()
  // Original job + options, so failed jobs can be re-queued with the same settings.
  const jobRegistry = new Map<string, { job: DownloadJob; opts: DownloadOptions }>()

  async function runWithRetry(job: DownloadJob, opts: DownloadOptions): Promise<void> {
    const outputPath = resolveOutputPath(job, opts, usedPaths)

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (cancelled.has(job.id)) {
        onProgress({ jobId: job.id, percent: 0, status: 'cancelled' })
        return
      }

      try {
        if (attempt > 1) {
          onProgress({ jobId: job.id, percent: 0, status: 'retrying' })
          await sleep(BACKOFF_BASE_MS * 2 ** (attempt - 1))
        } else {
          onProgress({ jobId: job.id, percent: 0, status: 'downloading' })
        }

        await runDownload(job, opts, outputPath, onProgress)
        onProgress({ jobId: job.id, percent: 100, status: 'done', outputPath })
        return
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          onProgress({
            jobId: job.id,
            percent: 0,
            status: 'failed',
            error: String(err),
          })
        }
      }
    }
  }

  function enqueue(job: DownloadJob, opts: DownloadOptions): void {
    jobRegistry.set(job.id, { job, opts })
    queue.add(() => runWithRetry(job, opts))
  }

  return {
    addJobs(jobs, opts) {
      for (const job of jobs) enqueue(job, opts)
    },
    retry(jobIds) {
      for (const id of jobIds) {
        const entry = jobRegistry.get(id)
        if (!entry) continue
        cancelled.delete(id)
        entry.job.attempt += 1
        onProgress({ jobId: id, percent: 0, status: 'pending' })
        enqueue(entry.job, entry.opts)
      }
    },
    cancel(jobIds) {
      for (const id of jobIds) cancelled.add(id)
    },
    pause() {
      queue.pause()
    },
    resume() {
      queue.start()
    },
    setConcurrency(n) {
      queue.concurrency = n
    },
    clear() {
      queue.clear()
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
