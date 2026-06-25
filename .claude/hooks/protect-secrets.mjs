#!/usr/bin/env node
// PreToolUse hook (matcher: Edit|Write).
// Blocks creating or modifying real dotenv secret files (.env, .env.local,
// .env.production, …) while always allowing the committed templates
// (.env.example / .env.sample). Backs the deny rules in settings.json for any
// new .env path the static rules don't enumerate.

import { basename } from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let filePath = '';
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0); // malformed input — don't interfere
}

const base = basename(filePath.replace(/\\/g, '/'));
const isDotenv = /^\.env(\..+)?$/.test(base);
const isTemplate = base === '.env.example' || base === '.env.sample';

if (isDotenv && !isTemplate) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Blocked write to secret file "${base}". Put real secrets only in your local environment; edit "${base.startsWith('.env') ? '.env.example' : base}" for committed defaults.`,
      },
    }),
  );
}

process.exit(0);
