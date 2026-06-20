import { ipcMain, dialog, app, type BrowserWindow } from 'electron'
import { z } from 'zod'
import Store from 'electron-store'
import { parseTakeoutCsv } from './import/takeout-csv'
import { fetchLibraryFromCookies } from './import/youtube-cookies'
import { createQueue } from './download/queue'
import type { QueueController } from './download/queue'
import { findExisting } from './download/manifest'
import {
  SettingsSchema,
  DownloadJobSchema,
  BrowserSchema,
  DISCLAIMER_VERSION,
  type Settings,
  type ProgressEvent,
} from '../../shared/types'

const store = new Store<Settings>({
  name: 'settings',
  defaults: SettingsSchema.parse({}),
})

let queueController: QueueController | null = null

function getSettings(): Settings {
  return SettingsSchema.parse(store.store)
}

function broadcastProgress(win: BrowserWindow, event: ProgressEvent) {
  if (!win.isDestroyed()) {
    win.webContents.send('download:progress', event)
  }
}

export function registerIpcHandlers(win: BrowserWindow): void {
  // Settings
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_e, partial: unknown) => {
    const update = SettingsSchema.partial().parse(partial)
    const merged = { ...getSettings(), ...update }
    const validated = SettingsSchema.parse(merged)
    store.store = validated
    return validated
  })

  // Disclaimer
  ipcMain.handle('disclaimer:status', () => {
    const s = getSettings()
    return {
      accepted: s.disclaimerAccepted && s.disclaimerVersion === DISCLAIMER_VERSION,
    }
  })

  ipcMain.handle('disclaimer:accept', () => {
    store.set('disclaimerAccepted', true)
    store.set('disclaimerVersion', DISCLAIMER_VERSION)
    store.set('disclaimerTimestamp', Date.now())
    return true
  })

  ipcMain.handle('disclaimer:reject', () => {
    app.quit()
  })

  // File dialogs
  ipcMain.handle('dialog:openFiles', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select Takeout CSV file(s)',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile', 'multiSelections'],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Select output folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Import
  ipcMain.handle('import:takeout', async (_e, filePaths: unknown) => {
    const paths = z.array(z.string()).parse(filePaths)
    return parseTakeoutCsv(paths)
  })

  ipcMain.handle('import:cookies', async (_e, browser: unknown) => {
    const b = BrowserSchema.parse(browser)
    return fetchLibraryFromCookies(b)
  })

  // Downloads
  ipcMain.handle('download:start', (_e, payload: unknown) => {
    const { jobs, outputDir, bitrate, filenameTemplate } = z
      .object({
        jobs: z.array(DownloadJobSchema),
        outputDir: z.string().min(1),
        bitrate: z.number().int().min(128).max(256),
        filenameTemplate: z.string(),
      })
      .parse(payload)

    if (!queueController) {
      const settings = getSettings()
      queueController = createQueue(settings.concurrency, (ev) => broadcastProgress(win, ev))
    }

    queueController.addJobs(jobs, { outputDir, bitrate, filenameTemplate })
  })

  ipcMain.handle('download:retry', (_e, jobIds: unknown) => {
    const ids = z.array(z.string()).parse(jobIds)
    queueController?.retry(ids)
  })

  ipcMain.handle('download:cancel', (_e, jobIds: unknown) => {
    const ids = z.array(z.string()).parse(jobIds)
    queueController?.cancel(ids)
  })

  ipcMain.handle('download:pause', () => {
    queueController?.pause()
  })

  ipcMain.handle('download:resume', () => {
    queueController?.resume()
  })

  ipcMain.handle('download:checkExisting', (_e, payload: unknown) => {
    const { jobs, outputDir } = z
      .object({
        jobs: z.array(DownloadJobSchema),
        outputDir: z.string().min(1),
        filenameTemplate: z.string(),
      })
      .parse(payload)

    const existingJobIds = jobs
      .filter((job) => findExisting(outputDir, job) !== null)
      .map((job) => job.id)

    return { total: jobs.length, existingJobIds }
  })

  ipcMain.handle('download:clearQueue', () => {
    queueController?.clear()
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())
}
