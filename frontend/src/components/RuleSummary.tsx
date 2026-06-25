import type { FormField, Rule } from '../lib/form-fields';
import { operatorLabel } from '../lib/rule-helpers';

interface RuleSummaryProps {
  rule: Rule;
  availableFields: FormField[];
}

function summarize(rule: Rule, availableFields: FormField[]): string {
  if (rule.kind === 'condition') {
    const field = availableFields.find((f) => f.name === rule.fieldName);
    const fieldLabel = field?.label ?? rule.fieldName;
    const opLabel = operatorLabel(rule.operator);
    const value = rule.value !== undefined && rule.value !== '' ? ` "${String(rule.value)}"` : '';
    return `${fieldLabel} ${opLabel}${value}`;
  }

  if (rule.rules.length === 0) {
    return `(empty ${rule.combinator} group)`;
  }

  if (rule.combinator === 'NOT') {
    const child = rule.rules[0];
    if (!child) return '(empty NOT group)';
    return `NOT (${summarize(child, availableFields)})`;
  }

  const parts = rule.rules.map((r) => summarize(r, availableFields));
  return `(${parts.join(` ${rule.combinator} `)})`;
}

export function RuleSummary({ rule, availableFields }: RuleSummaryProps) {
  return (
    <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-xs text-slate-600 font-mono break-words">
      {summarize(rule, availableFields)}
    </p>
  );
}
