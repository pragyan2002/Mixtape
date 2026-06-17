import { app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import { registerIpcHandlers } from './ipc'

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

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'))
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
