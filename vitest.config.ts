import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'shared/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'shared'),
    },
  },
})
