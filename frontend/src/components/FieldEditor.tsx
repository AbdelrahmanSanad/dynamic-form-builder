import { useState } from 'react';
import {
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  OPTION_FIELD_TYPES,
  type FieldType,
  type FormField,
} from '../lib/form-fields';
import { FieldCard } from './FieldCard';
import { Button, Label, Select } from './ui';

interface FieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

let idCounter = 0;
const nextId = () => `field_${Date.now()}_${idCounter++}`;

function makeField(type: FieldType, index: number): FormField {
  const base: FormField = {
    id: nextId(),
    type,
    label: `${FIELD_TYPE_LABELS[type]} field`,
    name: `field_${index + 1}`,
    required: false,
  };
  if (OPTION_FIELD_TYPES.has(type)) {
    base.options = [
      { label: 'Option 1', value: 'option_1' },
      { label: 'Option 2', value: 'option_2' },
    ];
  }
  if (type === 'file') {
    base.accept = [];
    base.maxSizeBytes = 5_242_880;
    base.maxFiles = 1;
  }
  return base;
}

export function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const [newType, setNewType] = useState<FieldType>('text');

  const update = (id: string, patch: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const clearVisibility = (id: string) => {
    onChange(
      fields.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f };
        delete next.visibility;
        return next;
      }),
    );
  };

  const remove = (id: string) => onChange(fields.filter((f) => f.id !== id));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const copy = [...fields];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item!);
    onChange(copy);
  };

  const add = () => onChange([...fields, makeField(newType, fields.length)]);

  return (
    <div className="space-y-4">
      {fields.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          No fields yet. Add your first field below.
        </p>
      )}

      {fields.map((field, index) => (
        <FieldCard
          key={field.id}
          field={field}
          index={index}
          fields={fields}
          onUpdate={(patch) => update(field.id, patch)}
          onRemove={() => remove(field.id)}
          onMove={(dir) => move(index, dir)}
          onClearVisibility={() => clearVisibility(field.id)}
        />
      ))}

      <div className="flex items-end gap-2">
        <div className="w-48">
          <Label>Add field</Label>
          <Select value={newType} onChange={(e) => setNewType(e.target.value as FieldType)}>
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {FIELD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={add}>
          + Add
        </Button>
      </div>
    </div>
  );
}
