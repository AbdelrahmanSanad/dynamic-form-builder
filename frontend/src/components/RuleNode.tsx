import { useRef } from 'react';
import type { FormField, Group, Rule } from '../lib/form-fields';
import { defaultOperatorFor, newGroup } from '../lib/rule-helpers';
import { Button, Select } from './ui';
import { ConditionEditor } from './ConditionEditor';

interface RuleNodeProps {
  rule: Rule;
  availableFields: FormField[];
  onChange: (r: Rule) => void;
  onRemove: () => void;
  depth?: number;
}

function replaceChild(group: Group, index: number, updated: Rule): Group {
  const rules = group.rules.map((r, i) => (i === index ? updated : r));
  return { ...group, rules };
}

function removeChild(group: Group, index: number): Group {
  return { ...group, rules: group.rules.filter((_, i) => i !== index) };
}

// Maps rule object identity → stable string key so React reconciles correctly
// when children are added/removed. Stored per RuleNode instance.
const INDENT_CLASSES = ['', 'pl-4', 'pl-8', 'pl-12', 'pl-16'];

export function RuleNode({ rule, availableFields, onChange, onRemove, depth = 0 }: RuleNodeProps) {
  const childKeys = useRef(new WeakMap<Rule, string>());
  const keyCounter = useRef(0);

  if (rule.kind === 'condition') {
    return (
      <ConditionEditor
        condition={rule}
        availableFields={availableFields}
        onChange={onChange}
        onRemove={onRemove}
      />
    );
  }

  const group = rule;
  const maxReached = group.rules.length >= 20 || (group.combinator === 'NOT' && group.rules.length >= 1);

  const handleCombinatorChange = (combinator: 'AND' | 'OR' | 'NOT') => {
    const truncated = combinator === 'NOT' && group.rules.length > 1 ? [group.rules[0]!] : group.rules;
    onChange({ ...group, combinator, rules: truncated });
  };

  const addCondition = () => {
    const first = availableFields[0];
    if (!first) return;
    const newCond: Rule = {
      kind: 'condition',
      fieldName: first.name,
      operator: defaultOperatorFor(first.type),
    };
    onChange({ ...group, rules: [...group.rules, newCond] });
  };

  const addGroup = () => {
    const child = newGroup('AND');
    onChange({ ...group, rules: [...group.rules, child] });
  };

  const indent = INDENT_CLASSES[Math.min(depth, INDENT_CLASSES.length - 1)] ?? 'pl-16';

  return (
    <div className={`rounded-md border border-slate-200 p-3 space-y-2 dark:border-slate-700 ${indent}`}>
      <div className="flex items-center gap-2">
        <Select
          className="w-24"
          value={group.combinator}
          onChange={(e) => handleCombinatorChange(e.target.value as 'AND' | 'OR' | 'NOT')}
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
          <option value="NOT">NOT</option>
        </Select>
        <span className="text-xs text-slate-500 dark:text-slate-400">group</span>
        <Button variant="ghost" type="button" onClick={onRemove} className="ml-auto px-2 py-1 text-red-500">
          ×
        </Button>
      </div>

      <div className="space-y-2 pl-2">
        {group.rules.map((child, i) => {
          if (!childKeys.current.has(child)) {
            childKeys.current.set(child, `rn-${keyCounter.current++}`);
          }
          const key = childKeys.current.get(child) ?? i;
          return (
          <RuleNode
            key={key}
            rule={child}
            availableFields={availableFields}
            onChange={(updated) => onChange(replaceChild(group, i, updated))}
            onRemove={() => onChange(removeChild(group, i))}
            depth={depth + 1}
          />
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="ghost"
          type="button"
          onClick={addCondition}
          disabled={maxReached || availableFields.length === 0}
          className="text-xs"
        >
          + Add condition
        </Button>
        <Button
          variant="ghost"
          type="button"
          onClick={addGroup}
          disabled={maxReached}
          className="text-xs"
        >
          + Add group
        </Button>
      </div>
    </div>
  );
}
