import type { FormField } from '../lib/form-fields';
import { Input, Label } from './ui';

interface FileFieldConfigProps {
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}

export function FileFieldConfig({ field, onUpdate }: FileFieldConfigProps) {
  const acceptStr = (field.accept ?? []).join(', ');
  const maxMb = field.maxSizeBytes !== undefined ? field.maxSizeBytes / 1_048_576 : 5;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <Label>Allowed file types (MIME, comma-separated)</Label>
        <Input
          value={acceptStr}
          placeholder="e.g. image/png, application/pdf"
          onChange={(e) => {
            const parsed = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            onUpdate({ accept: parsed });
          }}
        />
      </div>
      <div>
        <Label>Max size (MB)</Label>
        <Input
          type="number"
          min={1}
          value={maxMb}
          onChange={(e) => {
            const mb = parseFloat(e.target.value);
            if (!isNaN(mb) && mb > 0) onUpdate({ maxSizeBytes: Math.round(mb * 1_048_576) });
          }}
        />
      </div>
      <div>
        <Label>Max files</Label>
        <Input
          type="number"
          min={1}
          value={field.maxFiles ?? 1}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n > 0) onUpdate({ maxFiles: n });
          }}
        />
      </div>
    </div>
  );
}
