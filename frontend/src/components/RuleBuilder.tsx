import type { FormField, Rule } from '../lib/form-fields';
import { ruleSchema } from '../lib/form-fields';
import { newCondition, newGroup } from '../lib/rule-helpers';
import { Button } from './ui';
import { RuleNode } from './RuleNode';
import { RuleSummary } from './RuleSummary';

interface RuleBuilderProps {
  value: Rule | undefined;
  availableFields: FormField[];
  onChange: (r: Rule | undefined) => void;
  validationErrors?: string[];
}

export function RuleBuilder({ value, availableFields, onChange, validationErrors }: RuleBuilderProps) {
  if (availableFields.length === 0) {
    return (
      <p className="text-xs italic text-slate-400 dark:text-slate-500">
        Add fields before this one to set visibility rules.
      </p>
    );
  }

  if (value === undefined) {
    return (
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          const first = availableFields[0]!;
          // Start with one condition so the initial tree is immediately schema-valid.
          onChange({ ...newGroup('AND'), rules: [newCondition(first.name, first.type)] });
        }}
        className="text-xs text-indigo-600"
      >
        + Add visibility rule
      </Button>
    );
  }

  // Structural errors (e.g. empty groups) from the Zod rule schema.
  const structural = ruleSchema.safeParse(value);
  const structuralErrors = structural.success
    ? []
    : structural.error.issues.map((i) => i.message);

  const allErrors = [...structuralErrors, ...(validationErrors ?? [])];

  return (
    <div className="space-y-2">
      <RuleNode
        rule={value}
        availableFields={availableFields}
        onChange={onChange}
        onRemove={() => onChange(undefined)}
      />
      <RuleSummary rule={value} availableFields={availableFields} />
      {allErrors.length > 0 && (
        <ul className="space-y-0.5">
          {allErrors.map((e, i) => (
            <li key={i} className="text-xs text-red-600">
              {e}
            </li>
          ))}
        </ul>
      )}
      <Button
        variant="ghost"
        type="button"
        onClick={() => onChange(undefined)}
        className="text-xs text-red-500"
      >
        Clear rule
      </Button>
    </div>
  );
}
