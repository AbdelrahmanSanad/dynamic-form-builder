import {
  FIELD_TYPE_LABELS,
  OPTION_FIELD_TYPES,
  validateRuleReferences,
  type FormField,
  type Rule,
} from '../lib/form-fields';
import { FileFieldConfig } from './FileFieldConfig';
import { OptionsEditor } from './OptionsEditor';
import { RuleBuilder } from './RuleBuilder';
import { Button, Card, Input, Label } from './ui';

interface FieldCardProps {
  field: FormField;
  index: number;
  fields: FormField[];
  onUpdate: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onClearVisibility: () => void;
}

export function FieldCard({ field, index, fields, onUpdate, onRemove, onMove, onClearVisibility }: FieldCardProps) {
  const handleVisibilityChange = (v: Rule | undefined) => {
    if (v !== undefined) {
      onUpdate({ visibility: v });
    } else {
      onClearVisibility();
    }
  };

  const visibilityErrors = validateRuleReferences(fields).filter((e) =>
    e.includes(`'${field.name}'`),
  );

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" type="button" onClick={() => onMove(-1)} disabled={index === 0}>
            ↑
          </Button>
          <Button variant="ghost" type="button" onClick={() => onMove(1)} disabled={index === fields.length - 1}>
            ↓
          </Button>
          <Button variant="ghost" type="button" onClick={onRemove}>
            ✕
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Label</Label>
          <Input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
        </div>
        <div>
          <Label>Field name (key)</Label>
          <Input value={field.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })}
          />
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          Required
        </label>
      </div>

      {OPTION_FIELD_TYPES.has(field.type) && (
        <OptionsEditor
          options={field.options ?? []}
          onChange={(options) => onUpdate({ options })}
        />
      )}

      {field.type === 'file' && (
        <FileFieldConfig field={field} onUpdate={onUpdate} />
      )}

      <div className="mt-3">
        <Label>Visibility rule</Label>
        <RuleBuilder
          value={field.visibility}
          availableFields={fields.slice(0, index)}
          onChange={handleVisibilityChange}
          validationErrors={visibilityErrors}
        />
      </div>
    </Card>
  );
}
