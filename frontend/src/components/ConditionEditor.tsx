import type { Condition, FormField } from '../lib/form-fields';
import { OPERATORS } from '../lib/form-fields';
import { defaultOperatorFor, needsValueInput, operatorLabel } from '../lib/rule-helpers';
import { Button, Input, Select } from './ui';

interface ConditionEditorProps {
  condition: Condition;
  availableFields: FormField[];
  onChange: (c: Condition) => void;
  onRemove: () => void;
}

export function ConditionEditor({ condition, availableFields, onChange, onRemove }: ConditionEditorProps) {
  const selectedField = availableFields.find((f) => f.name === condition.fieldName);

  const handleFieldChange = (fieldName: string) => {
    const field = availableFields.find((f) => f.name === fieldName);
    if (!field) return;
    onChange({ kind: 'condition', fieldName, operator: defaultOperatorFor(field.type) });
  };

  const handleOperatorChange = (operator: string) => {
    // Drop value when switching to a presence operator so stale data doesn't accumulate.
    const next: Condition = needsValueInput(operator)
      ? { kind: 'condition', fieldName: condition.fieldName, operator, value: condition.value }
      : { kind: 'condition', fieldName: condition.fieldName, operator };
    onChange(next);
  };

  const handleValueChange = (value: string) => {
    onChange({ kind: 'condition', fieldName: condition.fieldName, operator: condition.operator, value });
  };

  const operators = selectedField ? (OPERATORS[selectedField.type] as readonly string[]) : [];
  const showValue = needsValueInput(condition.operator);
  const isOptionField =
    selectedField &&
    (selectedField.type === 'select' ||
      selectedField.type === 'radio' ||
      selectedField.type === 'checkboxes');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-40"
        value={condition.fieldName}
        onChange={(e) => handleFieldChange(e.target.value)}
      >
        {availableFields.length === 0 && <option value="">— no fields —</option>}
        {availableFields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </Select>

      <Select
        className="w-44"
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value)}
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {operatorLabel(op)}
          </option>
        ))}
      </Select>

      {showValue && isOptionField ? (
        <Select
          className="w-36"
          value={typeof condition.value === 'string' ? condition.value : ''}
          onChange={(e) => handleValueChange(e.target.value)}
        >
          <option value="">— pick —</option>
          {(selectedField.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : showValue ? (
        <Input
          className="w-36"
          type={selectedField?.type === 'number' ? 'number' : 'text'}
          value={typeof condition.value === 'string' || typeof condition.value === 'number' ? String(condition.value) : ''}
          onChange={(e) => handleValueChange(e.target.value)}
        />
      ) : null}

      <Button variant="ghost" type="button" onClick={onRemove} className="px-2 py-1 text-red-500">
        ×
      </Button>
    </div>
  );
}
