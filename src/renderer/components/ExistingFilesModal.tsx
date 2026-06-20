import React from 'react'
import { FileCheck2 } from 'lucide-react'
import { Button } from './Button'

interface Props {
  existingCount: number
  total: number
  onSkipExisting: () => void
  onDownloadAll: () => void
  onCancel: () => void
}

export function ExistingFilesModal({
  existingCount,
  total,
  onSkipExisting,
  onDownloadAll,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="glass rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <FileCheck2 size={22} className="text-primary" />
          <h1 className="text-lg font-bold text-text">Some songs already exist</h1>
        </div>

        <p className="text-text text-sm">
          <strong>{existingCount}</strong> of <strong>{total}</strong> selected song
          {total === 1 ? '' : 's'} already exist in this folder. Skip the ones you already have, or
          download everything anyway (existing files are kept — new copies get a numbered suffix).
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <Button variant="primary" onClick={onSkipExisting}>
            Skip existing, download {total - existingCount} new
          </Button>
          <Button variant="ghost" onClick={onDownloadAll}>
            Download all {total}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
