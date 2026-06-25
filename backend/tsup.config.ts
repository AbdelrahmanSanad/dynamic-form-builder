import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  minify: false,
  // Keep dependencies (including the Prisma engine) external and resolved
  // at runtime from node_modules rather than bundled into the output.
  skipNodeModulesBundle: true,
});
