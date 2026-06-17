import React from 'react'
import { Button } from './Button'
import { ipc } from '../lib/ipc'

interface Props {
  onAccepted: () => void
}

export function DisclaimerModal({ onAccepted }: Props) {
  const [loading, setLoading] = React.useState(false)

  async function handleAccept() {
    setLoading(true)
    await ipc.disclaimer.accept()
    onAccepted()
  }

  async function handleReject() {
    await ipc.disclaimer.reject()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎵</span>
          <h1 className="text-xl font-bold text-white">Mixtape: Personal Use Notice</h1>
        </div>

        <div className="text-slate-300 text-sm space-y-3 max-h-64 overflow-y-auto pr-1">
          <p>
            Mixtape downloads audio from YouTube Music for <strong>personal, lawful use only</strong>.
            Before continuing, please read and agree to the following:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Use this app only to download content you have legitimate access to.</li>
            <li>Do not use this app to distribute, sell, or share downloaded audio.</li>
            <li>
              Mixtape does not circumvent DRM. It downloads publicly available streams the same way
              a browser does.
            </li>
            <li>
              This app is not affiliated with or endorsed by Google, YouTube, or Apple Inc.
            </li>
            <li>
              You assume full responsibility for how you use this software. The author provides
              Mixtape "as-is" with no warranties and accepts no liability.
            </li>
            <li>
              This is a personal tool for loading your own music library onto personal devices (e.g.
              iPod). Respect copyright law in your jurisdiction.
            </li>
          </ul>
          <p className="text-slate-400 text-xs">
            By clicking "I Accept", you confirm you have read and agree to the{' '}
            <span className="text-violet-400">terms above</span> and the app&apos;s{' '}
            <span className="text-violet-400">MIT License</span>.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="primary" loading={loading} onClick={handleAccept} className="flex-1">
            I Accept, Continue
          </Button>
          <Button variant="ghost" onClick={handleReject} className="flex-1">
            Reject &amp; Quit
          </Button>
        </div>
      </div>
    </div>
  )
}
