import { describe, it, expect } from 'vitest'
import { parseProgress } from './progress'

describe('parseProgress', () => {
  it('parses a download progress line', () => {
    const line = '[download]  23.5% of 4.72MiB at 1.23MiB/s ETA 00:03'
    const result = parseProgress('job-1', line)
    expect(result).not.toBeNull()
    expect(result!.percent).toBeCloseTo(23.5)
    expect(result!.status).toBe('downloading')
    expect(result!.speed).toBe('1.23MiB/s')
    expect(result!.eta).toBe('00:03')
  })

  it('parses 100% completion line', () => {
    const line = '[download] 100% of 4.72MiB at 3.00MiB/s ETA 00:00'
    const result = parseProgress('job-1', line)
    expect(result).not.toBeNull()
    expect(result!.percent).toBe(100)
  })

  it('parses a transcoding line', () => {
    const line = '[Merger] Merging formats into "output.mp3"'
    const result = parseProgress('job-2', line)
    expect(result).not.toBeNull()
    expect(result!.status).toBe('transcoding')
    expect(result!.percent).toBe(99)
  })

  it('returns null for irrelevant lines', () => {
    expect(parseProgress('x', '[info] Some info line')).toBeNull()
    expect(parseProgress('x', '[youtube] Downloading webpage')).toBeNull()
    expect(parseProgress('x', '')).toBeNull()
  })

  it('passes jobId through', () => {
    const result = parseProgress('my-job-id', '[download]  50.0% of 1MiB at 1MiB/s ETA 00:01')
    expect(result!.jobId).toBe('my-job-id')
  })
})
