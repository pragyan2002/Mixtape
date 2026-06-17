import React from 'react'
import { Music2, Library, Download, Settings, type LucideIcon } from 'lucide-react'

export type Page = 'import' | 'library' | 'downloads' | 'settings'

const tabs: { id: Page; label: string; Icon: LucideIcon }[] = [
  { id: 'import', label: 'Import', Icon: Music2 },
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'downloads', label: 'Downloads', Icon: Download },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

interface NavBarProps {
  page: Page
  onChange: (p: Page) => void
  trackCount: number
  downloadCount: number
}

export function NavBar({ page, onChange, trackCount, downloadCount }: NavBarProps) {
  return (
    <nav className="flex items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
      <div className="flex items-center gap-2 mr-6">
        <span className="text-violet-400 text-lg">🎵</span>
        <span className="font-bold text-white tracking-tight">Mixtape</span>
      </div>
      {tabs.map(({ id, label, Icon }) => {
        const isActive = page === id
        const badge =
          id === 'library' && trackCount > 0
            ? trackCount
            : id === 'downloads' && downloadCount > 0
              ? downloadCount
              : null

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative',
              isActive
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700',
            ].join(' ')}
          >
            <Icon size={15} />
            {label}
            {badge !== null && (
              <span className="ml-1 text-xs bg-slate-600 text-slate-200 rounded-full px-1.5 py-0.5 leading-none">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
