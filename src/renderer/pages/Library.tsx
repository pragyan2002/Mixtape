import React from 'react'
import { Music, AlertTriangle, FolderOpen, Download } from 'lucide-react'
import { Button } from '../components/Button'
import { ipc } from '../lib/ipc'
import type { Track, DownloadJob } from '../../../shared/types'

interface Props {
  tracks: Track[]
  onStartDownload: (jobs: DownloadJob[], outputDir: string) => void
}

function TrackRow({
  track,
  selected,
  onToggle,
}: {
  track: Track
  selected: boolean
  onToggle: () => void
}) {
  return (
    <tr
      className={[
        'border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer',
        selected ? 'bg-slate-800/30' : '',
      ].join(' ')}
      onClick={onToggle}
    >
      <td className="px-4 py-2.5 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="rounded accent-violet-500"
        />
      </td>
      <td className="px-3 py-2.5">
        {track.thumbnailUrl ? (
          <img
            src={track.thumbnailUrl}
            alt=""
            className="w-8 h-8 rounded object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center">
            <Music size={14} className="text-slate-400" />
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-200 font-medium">{track.title}</span>
          {track.isMusicVideo && (
            <span title="Music video — audio may contain video audio track">
              <AlertTriangle size={13} className="text-amber-400" />
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-sm text-slate-400">{track.artist}</td>
      <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{track.videoId}</td>
    </tr>
  )
}

export function LibraryPage({ tracks, onStartDownload }: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [outputDir, setOutputDir] = React.useState('')
  const [filter, setFilter] = React.useState('')

  const filtered = React.useMemo(() => {
    if (!filter) return tracks
    const q = filter.toLowerCase()
    return tracks.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    )
  }, [tracks, filter])

  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.videoId))

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => {
        const n = new Set(s)
        filtered.forEach((t) => n.delete(t.videoId))
        return n
      })
    } else {
      setSelected((s) => {
        const n = new Set(s)
        filtered.forEach((t) => n.add(t.videoId))
        return n
      })
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function handlePickFolder() {
    const folder = await ipc.dialog.openFolder()
    if (folder) setOutputDir(folder)
  }

  function handleDownload() {
    const toDownload = tracks.filter((t) => selected.has(t.videoId))
    const jobs: DownloadJob[] = toDownload.map((track) => ({
      id: crypto.randomUUID(),
      track,
      status: 'pending',
      progress: 0,
      attempt: 0,
    }))
    onStartDownload(jobs, outputDir)
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <Music size={48} />
        <p className="text-lg font-medium">No tracks imported yet</p>
        <p className="text-sm">Go to Import to load your library.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900/50 shrink-0">
        <input
          type="search"
          placeholder="Filter tracks…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
        <span className="text-sm text-slate-400 whitespace-nowrap">
          {selected.size} / {tracks.length} selected
        </span>
        <button
          onClick={handlePickFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
        >
          <FolderOpen size={15} />
          {outputDir ? outputDir.split(/[\\/]/).pop() : 'Output folder'}
        </button>
        <Button
          variant="primary"
          disabled={selected.size === 0 || !outputDir}
          onClick={handleDownload}
        >
          <Download size={15} />
          Download {selected.size > 0 ? `(${selected.size})` : ''}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="px-4 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded accent-violet-500"
                />
              </th>
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Title
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Artist
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Video ID
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((track) => (
              <TrackRow
                key={track.videoId}
                track={track}
                selected={selected.has(track.videoId)}
                onToggle={() => toggleOne(track.videoId)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!outputDir && selected.size > 0 && (
        <div className="px-4 py-2 bg-amber-900/30 border-t border-amber-700 text-amber-300 text-sm shrink-0">
          Pick an output folder before downloading.
        </div>
      )}
    </div>
  )
}
