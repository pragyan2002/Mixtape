import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: 'violet' | 'emerald' | 'rose' | 'amber'
}

const colorClass = {
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
}

export function ProgressBar({ value, max = 100, className = '', color = 'violet' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={`h-2 w-full rounded-full bg-slate-700 overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${colorClass[color]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
