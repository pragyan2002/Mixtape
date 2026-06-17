import PQueue from 'p-queue'
import { runDownload, DownloadOptions } from './downloader'
import type { DownloadJob, ProgressEvent } from '../../../shared/types'

const MAX_ATTEMPTS = 3
const BACKOFF_BASE_MS = 2000

export interface QueueController {
  addJobs: (jobs: DownloadJob[], opts: DownloadOptions) => void
  cancel: (jobIds: string[]) => void
  setConcurrency: (n: number) => void
  clear: () => void
}

export function createQueue(
  concurrency: number,
  onProgress: (event: ProgressEvent) => void,
): QueueController {
  const queue = new PQueue({ concurrency })
  const cancelled = new Set<string>()

  async function runWithRetry(job: DownloadJob, opts: DownloadOptions): Promise<void> {
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

        const outputPath = await runDownload(job, opts, onProgress)
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

  return {
    addJobs(jobs, opts) {
      for (const job of jobs) {
        queue.add(() => runWithRetry(job, opts))
      }
    },
    cancel(jobIds) {
      for (const id of jobIds) cancelled.add(id)
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
