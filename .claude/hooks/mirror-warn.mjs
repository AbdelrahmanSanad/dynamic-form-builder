#!/usr/bin/env node
// PostToolUse hook (matcher: Edit|Write).
// When one of the two intentionally-duplicated field-model files is edited, it
// injects a reminder so the other mirror (and the renderer/editor/tests) don't
// silently drift. Non-blocking — purely advisory context.

let raw = '';
for await (const chunk of process.stdin) raw += chunk;

let filePath = '';
try {
  filePath = JSON.parse(raw)?.tool_input?.file_path ?? '';
} catch {
  process.exit(0);
}

const norm = filePath.replace(/\\/g, '/');
const isBackend = norm.endsWith('backend/src/modules/forms/form-fields.ts');
const isFrontend = norm.endsWith('frontend/src/lib/form-fields.ts');

if (isBackend || isFrontend) {
  const other = isBackend
    ? 'frontend/src/lib/form-fields.ts'
    : 'backend/src/modules/forms/form-fields.ts';
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          `You edited a field-model mirror. Keep ${other} in sync ` +
          `(FIELD_TYPES, the field schema, and buildSubmissionSchema). If a field type ` +
          `changed, also update frontend DynamicForm.tsx + FieldEditor.tsx and the ` +
          `backend form-fields tests. Run /mirror-check to verify.`,
      },
    }),
  );
}

process.exit(0);
