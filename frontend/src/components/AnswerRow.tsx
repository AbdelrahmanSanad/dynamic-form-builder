import type { ReactNode } from 'react';
import type { FormField } from '../lib/form-fields';
import type { FileReference } from '../types';
import { FileAnswerLinks } from './FileAnswerLinks';

interface Props {
  field: FormField;
  value: unknown;
  formId: string;
  submissionId: string;
}

function resolveOptionLabel(field: FormField, raw: string): string {
  const opt = (field.options ?? []).find((o) => o.value === raw);
  return opt ? opt.label : raw;
}

export function AnswerRow({ field, value, formId, submissionId }: Props) {
  const isEmpty = value === undefined || value === null || value === '';
  let display: ReactNode = '—';

  if (!isEmpty) {
    switch (field.type) {
      case 'checkbox':
        display = value ? 'Yes' : 'No';
        break;
      case 'select':
      case 'radio':
        display = resolveOptionLabel(field, String(value));
        break;
      case 'checkboxes': {
        const vals = Array.isArray(value) ? value : [value];
        display = vals.map((v) => resolveOptionLabel(field, String(v))).join(', ') || '—';
        break;
      }
      case 'file': {
        const refs: FileReference[] = Array.isArray(value)
          ? (value as FileReference[])
          : [value as FileReference];
        display = (
          <FileAnswerLinks refs={refs} formId={formId} submissionId={submissionId} />
        );
        break;
      }
      default:
        display = String(value);
    }
  }

  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-600">{field.label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">{display}</dd>
    </div>
  );
}
