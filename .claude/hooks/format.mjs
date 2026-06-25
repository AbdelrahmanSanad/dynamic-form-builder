#!/usr/bin/env node
// PostToolUse hook (matcher: Edit|Write).
// Formats the just-written TypeScript file with the package-local Prettier so
// style stays consistent without a manual `npm run format`. Non-blocking: any
// problem (no prettier installed, non-TS file, parse error) exits 0 silently.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let filePath = '';
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}

if (!/\.(ts|tsx)$/.test(filePath)) process.exit(0);

// Walk up to the nearest package.json so we use that package's Prettier + config.
let dir = dirname(filePath);
let root = null;
while (dir && dir !== dirname(dir)) {
  if (existsSync(join(dir, 'package.json'))) {
    root = dir;
    break;
  }
  dir = dirname(dir);
}
if (!root) process.exit(0);

const bin = process.platform === 'win32' ? 'prettier.cmd' : 'prettier';
const prettier = join(root, 'node_modules', '.bin', bin);
if (!existsSync(prettier)) process.exit(0); // not installed — skip quietly

spawnSync(prettier, ['--write', filePath], { cwd: root, stdio: 'ignore' });
process.exit(0);
