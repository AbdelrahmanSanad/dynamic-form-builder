import type { Condition, Group, Rule } from './form-fields';
import { OPERATORS } from './form-fields';
import type { FieldType } from './form-fields';

export function newCondition(fieldName: string, fieldType: FieldType): Condition {
  return { kind: 'condition', fieldName, operator: defaultOperatorFor(fieldType) };
}

export function newGroup(combinator: 'AND' | 'OR' | 'NOT'): Group {
  return { kind: 'group', combinator, rules: [] };
}

export function defaultOperatorFor(type: FieldType): string {
  const op = OPERATORS[type][0];
  if (op === undefined) throw new Error(`No operators defined for field type: ${type}`);
  return op;
}

export function needsValueInput(operator: string): boolean {
  return !['isEmpty', 'isNotEmpty', 'isPresent', 'isAbsent', 'isTrue', 'isFalse'].includes(operator);
}

export function operatorLabel(op: string): string {
  const labels: Record<string, string> = {
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
    eq: '=',
    notEq: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    isTrue: 'is checked',
    isFalse: 'is unchecked',
    includes: 'includes',
    notIncludes: 'does not include',
    isPresent: 'has a file',
    isAbsent: 'has no file',
  };
  return labels[op] ?? op;
}

export type { Condition, Group, Rule };
