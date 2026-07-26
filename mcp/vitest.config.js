// Vitest config for the MCP server tool tests. Mirrors the conventions of frontend/vite.config.js
// (no global config, no auto-watch, run once and exit) — kept in mcp/ rather than hoisted to the
// repo root so this package is self-contained and re-usable for any Node-side helper we add later.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    // The tests import from ../src and ../../frontend/src/lib, both already ESM — no transform
    // needed beyond what Vite does natively. Fake timers are used in tests that pin "today"
    // (see tools.test.js header comment); they only mock Date, not setTimeout, so the file
    // watcher in state.js (real setTimeout/setInterval via fs.watch) keeps working.
    globals: false,
    environment: 'node',
    pool: 'forks',
    // Stryker spawns vitest per-mutant; isolating each test file in its own process keeps a
    // crashing mutant from taking siblings down with it. Costs ~50ms/test, trade worth it.
    isolate: true,
    reporters: ['default']
  }
})
