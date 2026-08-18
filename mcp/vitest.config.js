import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    globals: false,
    environment: 'node',
    pool: 'forks',
    isolate: true,
    reporters: ['default']
  }
})
