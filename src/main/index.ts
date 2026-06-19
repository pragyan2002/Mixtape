import { app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { registerIpcHandlers } from './ipc'

/**
 * Resolve the built renderer entry (index.html) across the packaging layouts
 * electron-builder can produce. Depending on how `files`/`asar` are configured,
 * the compiled main process may sit at `app.asar/out/main` or `app.asar/main`,
 * so the renderer can be a sibling at `../renderer` or `../../out/renderer`.
 * Loading a path that doesn't exist inside the asar surfaces to the user as
 * "Not allowed to load local resource", so probe the candidates and pick the
 * first that actually exists rather than trusting a single relative guess.
 */
function resolveRendererIndex(): string {
  const candidates = [
    path.join(__dirname, '../renderer/index.html'),
    path.join(__dirname, '../../renderer/index.html'),
    path.join(__dirname, '../../out/renderer/index.html'),
    path.join(app.getAppPath(), 'out/renderer/index.html'),
    path.join(app.getAppPath(), 'renderer/index.html'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  // None found: return the primary expected path so loadFile emits a clear,
  // actionable error instead of silently loading nothing.
  console.error(
    '[mixtape] renderer index.html not found. Searched:\n' + candidates.join('\n'),
  )
  return candidates[0]
}

const SINGLE_INSTANCE = app.requestSingleInstanceLock()
if (!SINGLE_INSTANCE) {
  app.quit()
  process.exit(0)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: 'Mixtape',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    show: false,
  })

  win.once('ready-to-show', () => win.show())

  // Block navigation to external URLs; only allow validated https:// via shell
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) e.preventDefault()
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(www\.)?youtube\.com/.test(url) || /^https:\/\/music\.youtube\.com/.test(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Surface load failures (missing/blocked resources) instead of a blank window.
  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    console.error(
      `[mixtape] renderer failed to load (${errorCode} ${errorDescription}): ${validatedURL}`,
    )
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(resolveRendererIndex())
  }

  return win
}

app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows()
  if (wins.length > 0) {
    const win = wins[0]
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(() => {
  const win = createWindow()
  registerIpcHandlers(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
