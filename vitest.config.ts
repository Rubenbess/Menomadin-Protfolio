import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    // Vitest's default `exclude` covers node_modules, dist, .next, etc., but not
    // `.claude/worktrees/**` — without this, ad-hoc agent worktrees on disk
    // leak duplicate (and possibly stale) test files into every run, inflating
    // counts and slowing CI.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.claude/worktrees/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
