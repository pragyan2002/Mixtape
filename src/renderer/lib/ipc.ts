import type { MixtapeAPI } from '../../preload/index'

declare global {
  interface Window {
    mixtape: MixtapeAPI
  }
}

export const ipc = window.mixtape
