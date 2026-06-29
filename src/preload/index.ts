import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  Settings,
  ImportResult,
  ImportProgressEvent,
  DownloadJob,
  ProgressEvent,
  Browser,
} from '../../shared/types'

export type MixtapeAPI = typeof api

const api = {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    set: (partial: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', partial),
  },

  disclaimer: {
    status: (): Promise<{ accepted: boolean }> => ipcRenderer.invoke('disclaimer:status'),
    accept: (): Promise<boolean> => ipcRenderer.invoke('disclaimer:accept'),
    reject: (): Promise<void> => ipcRenderer.invoke('disclaimer:reject'),
  },

  dialog: {
    openFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
    openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
    getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  },

  import: {
    takeout: (filePaths: string[]): Promise<ImportResult> =>
      ipcRenderer.invoke('import:takeout', filePaths),
    cookies: (browser: Browser): Promise<ImportResult> =>
      ipcRenderer.invoke('import:cookies', browser),
    spotify: (filePaths: string[]): Promise<ImportResult> =>
      ipcRenderer.invoke('import:spotify', filePaths),
    onProgress: (cb: (event: ImportProgressEvent) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, ev: ImportProgressEvent) => cb(ev)
      ipcRenderer.on('import:progress', handler)
      return () => ipcRenderer.off('import:progress', handler)
    },
  },

  download: {
    start: (payload: {
      jobs: DownloadJob[]
      outputDir: string
      bitrate: number
      filenameTemplate: string
    }): Promise<void> => ipcRenderer.invoke('download:start', payload),
    checkExisting: (payload: {
      jobs: DownloadJob[]
      outputDir: string
      filenameTemplate: string
    }): Promise<{ total: number; existingJobIds: string[] }> =>
      ipcRenderer.invoke('download:checkExisting', payload),
    retry: (jobIds: string[]): Promise<void> => ipcRenderer.invoke('download:retry', jobIds),
    cancel: (jobIds: string[]): Promise<void> => ipcRenderer.invoke('download:cancel', jobIds),
    pause: (): Promise<void> => ipcRenderer.invoke('download:pause'),
    resume: (): Promise<void> => ipcRenderer.invoke('download:resume'),
    clearQueue: (): Promise<void> => ipcRenderer.invoke('download:clearQueue'),
    onProgress: (cb: (event: ProgressEvent) => void): (() => void) => {
      const handler = (_e: Electron.IpcRendererEvent, ev: ProgressEvent) => cb(ev)
      ipcRenderer.on('download:progress', handler)
      return () => ipcRenderer.off('download:progress', handler)
    },
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  },
}

contextBridge.exposeInMainWorld('mixtape', api)
