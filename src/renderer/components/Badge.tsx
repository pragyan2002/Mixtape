import React from 'react'
import type { DownloadStatus } from '../../../shared/types'

interface BadgeProps {
  status: DownloadStatus
}

const config: Record<DownloadStatus, { label: string; className: string }> = {
  pending: { label: 'Queued', className: 'bg-slate-600 text-slate-300' },
  downloading: { label: 'Downloading', className: 'bg-blue-600 text-blue-100 animate-pulse' },
  transcoding: { label: 'Converting', className: 'bg-amber-600 text-amber-100 animate-pulse' },
  done: { label: 'Done', className: 'bg-emerald-600 text-emerald-100' },
  failed: { label: 'Failed', className: 'bg-rose-600 text-rose-100' },
  retrying: { label: 'Retrying', className: 'bg-orange-600 text-orange-100' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500 text-slate-300' },
}

export function StatusBadge({ status }: BadgeProps) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
