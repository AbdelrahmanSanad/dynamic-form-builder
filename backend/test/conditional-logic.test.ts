import { describe, expect, it } from 'vitest';
import {
  evaluate,
  formSchemaArray,
  validateRuleReferences,
  visibleFields,
  type FormField,
  type Rule,
} from '../src/modules/forms/form-fields.js';

const cond = (
  fieldName: string,
  operator: string,
  value?: unknown,
): Rule => ({ kind: 'condition', fieldName, operator, value });

const group = (combinator: 'AND' | 'OR' | 'NOT', rules: Rule[]): Rule => ({
  kind: 'group',
  combinator,
  rules,
});

describe('evaluate — group combinators', () => {
  it('AND: true only when all children are true', () => {
    const answers = { a: 'x', b: 'y' };
    expect(evaluate(group('AND', [cond('a', 'equals', 'x'), cond('b', 'equals', 'y')]), answers)).toBe(true);
    expect(evaluate(group('AND', [cond('a', 'equals', 'x'), cond('b', 'equals', 'z')]), answers)).toBe(false);
  });

  it('OR: true when at least one child is true', () => {
    const answers = { a: 'x', b: 'y' };
    expect(evaluate(group('OR', [cond('a', 'equals', 'no'), cond('b', 'equals', 'no')]), answers)).toBe(false);
    expect(evaluate(group('OR', [cond('a', 'equals', 'no'), cond('b', 'equals', 'y')]), answers)).toBe(true);
  });

  it('NOT: negates its single child', () => {
    const answers = { a: 'x' };
    expect(evaluate(group('NOT', [cond('a', 'equals', 'x')]), answers)).toBe(false);
    expect(evaluate(group('NOT', [cond('a', 'equals', 'other')]), answers)).toBe(true);
  });

  it('deep nesting: AND within OR within NOT', () => {
    const answers = { country: 'SA', age: 20, consent: true };
    const inner = group('AND', [cond('age', 'gt', 18), cond('consent', 'isTrue')]);
    const mid = group('OR', [cond('country', 'equals', 'US'), inner]);
    const outer = group('NOT', [mid]);
    // mid is true (inner true), so NOT → false
    expect(evaluate(outer, answers)).toBe(false);
    // Flip consent → inner false, country !== US → mid false → NOT true
    expect(evaluate(outer, { ...answers, consent: false })).toBe(true);
  });
});

describe('evaluate — every operator match/mismatch', () => {
  it('text operators', () => {
    expect(evaluate(cond('f', 'equals', 'abc'), { f: 'abc' })).toBe(true);
    expect(evaluate(cond('f', 'equals', 'abc'), { f: 'xyz' })).toBe(false);
    expect(evaluate(cond('f', 'notEquals', 'abc'), { f: 'xyz' })).toBe(true);
    expect(evaluate(cond('f', 'notEquals', 'abc'), { f: 'abc' })).toBe(false);
    expect(evaluate(cond('f', 'contains', 'bc'), { f: 'abcd' })).toBe(true);
    expect(evaluate(cond('f', 'contains', 'zz'), { f: 'abcd' })).toBe(false);
    expect(evaluate(cond('f', 'startsWith', 'ab'), { f: 'abcd' })).toBe(true);
    expect(evaluate(cond('f', 'startsWith', 'cd'), { f: 'abcd' })).toBe(false);
    expect(evaluate(cond('f', 'endsWith', 'cd'), { f: 'abcd' })).toBe(true);
    expect(evaluate(cond('f', 'endsWith', 'ab'), { f: 'abcd' })).toBe(false);
    expect(evaluate(cond('f', 'isEmpty'), { f: '' })).toBe(true);
    expect(evaluate(cond('f', 'isEmpty'), { f: 'x' })).toBe(false);
    expect(evaluate(cond('f', 'isNotEmpty'), { f: 'x' })).toBe(true);
    expect(evaluate(cond('f', 'isNotEmpty'), { f: '' })).toBe(false);
  });

  it('number/date operators', () => {
    expect(evaluate(cond('n', 'eq', 5), { n: 5 })).toBe(true);
    expect(evaluate(cond('n', 'eq', 5), { n: 6 })).toBe(false);
    expect(evaluate(cond('n', 'notEq', 5), { n: 6 })).toBe(true);
    expect(evaluate(cond('n', 'notEq', 5), { n: 5 })).toBe(false);
    expect(evaluate(cond('n', 'gt', 5), { n: 6 })).toBe(true);
    expect(evaluate(cond('n', 'gt', 5), { n: 5 })).toBe(false);
    expect(evaluate(cond('n', 'gte', 5), { n: 5 })).toBe(true);
    expect(evaluate(cond('n', 'gte', 5), { n: 4 })).toBe(false);
    expect(evaluate(cond('n', 'lt', 5), { n: 4 })).toBe(true);
    expect(evaluate(cond('n', 'lt', 5), { n: 5 })).toBe(false);
    expect(evaluate(cond('n', 'lte', 5), { n: 5 })).toBe(true);
    expect(evaluate(cond('n', 'lte', 5), { n: 6 })).toBe(false);
    // NaN guard
    expect(evaluate(cond('n', 'gt', 5), { n: 'abc' })).toBe(false);
  });

  it('checkbox operators', () => {
    expect(evaluate(cond('c', 'isTrue'), { c: true })).toBe(true);
    expect(evaluate(cond('c', 'isTrue'), { c: false })).toBe(false);
    expect(evaluate(cond('c', 'isFalse'), { c: false })).toBe(true);
    expect(evaluate(cond('c', 'isFalse'), { c: true })).toBe(false);
  });

  it('checkboxes operators', () => {
    expect(evaluate(cond('m', 'includes', 'a'), { m: ['a', 'b'] })).toBe(true);
    expect(evaluate(cond('m', 'includes', 'z'), { m: ['a', 'b'] })).toBe(false);
    expect(evaluate(cond('m', 'notIncludes', 'z'), { m: ['a', 'b'] })).toBe(true);
    expect(evaluate(cond('m', 'notIncludes', 'a'), { m: ['a', 'b'] })).toBe(false);
  });

  it('file operators', () => {
    expect(evaluate(cond('up', 'isPresent'), { up: { storageKey: 'k' } })).toBe(true);
    expect(evaluate(cond('up', 'isPresent'), { up: undefined })).toBe(false);
    expect(evaluate(cond('up', 'isAbsent'), { up: undefined })).toBe(true);
    expect(evaluate(cond('up', 'isAbsent'), { up: { storageKey: 'k' } })).toBe(false);
  });

  it('unknown operator never throws and returns false', () => {
    expect(evaluate(cond('f', 'bogus', 'x'), { f: 'x' })).toBe(false);
  });
});

describe('evaluate — missing/undefined answers', () => {
  it('emptiness operators treat missing as empty', () => {
    expect(evaluate(cond('missing', 'isEmpty'), {})).toBe(true);
    expect(evaluate(cond('missing', 'isAbsent'), {})).toBe(true);
  });

  it('value operators are false for missing answers', () => {
    expect(evaluate(cond('missing', 'equals', 'x'), {})).toBe(false);
    expect(evaluate(cond('missing', 'gt', 1), {})).toBe(false);
    expect(evaluate(cond('missing', 'isTrue'), {})).toBe(false);
    // notEquals on undefined must return false, not true (would coerce to "undefined")
    expect(evaluate(cond('missing', 'notEquals', 'x'), {})).toBe(false);
    // notIncludes on undefined must return false, not true
    expect(evaluate(cond('missing', 'notIncludes', 'x'), {})).toBe(false);
  });

  it('date ordering operators compare ISO date strings correctly', () => {
    const earlier = '2020-01-01';
    const later = '2024-06-01';
    expect(evaluate(cond('d', 'gt', earlier), { d: later })).toBe(true);
    expect(evaluate(cond('d', 'gt', later), { d: earlier })).toBe(false);
    expect(evaluate(cond('d', 'gte', earlier), { d: earlier })).toBe(true);
    expect(evaluate(cond('d', 'lt', later), { d: earlier })).toBe(true);
    expect(evaluate(cond('d', 'eq', earlier), { d: earlier })).toBe(true);
    expect(evaluate(cond('d', 'eq', earlier), { d: later })).toBe(false);
    expect(evaluate(cond('d', 'notEq', earlier), { d: later })).toBe(true);
  });
});

describe('validateRuleReferences', () => {
  const base = (over: Partial<FormField>): FormField =>
    ({
      id: over.id ?? over.name ?? 'id',
      type: 'text',
      label: 'L',
      name: 'n',
      required: false,
      ...over,
    }) as FormField;

  it('accepts a valid forward-free rule', () => {
    const fields: FormField[] = [
      base({ id: 'f1', name: 'country', type: 'text' }),
      base({ id: 'f2', name: 'city', type: 'text', visibility: cond('country', 'equals', 'SA') }),
    ];
    expect(validateRuleReferences(fields)).toEqual([]);
  });

  it('rejects a forward reference', () => {
    const fields: FormField[] = [
      base({ id: 'f1', name: 'city', type: 'text', visibility: cond('country', 'equals', 'SA') }),
      base({ id: 'f2', name: 'country', type: 'text' }),
    ];
    const issues = validateRuleReferences(fields);
    expect(issues.some((m) => m.includes('does not precede'))).toBe(true);
  });

  it('rejects an unknown field reference', () => {
    const fields: FormField[] = [
      base({ id: 'f1', name: 'city', type: 'text', visibility: cond('ghost', 'equals', 'x') }),
    ];
    const issues = validateRuleReferences(fields);
    expect(issues.some((m) => m.includes('unknown field'))).toBe(true);
  });

  it('rejects an illegal operator for the target type', () => {
    const fields: FormField[] = [
      base({ id: 'f1', name: 'agree', type: 'checkbox' }),
      base({ id: 'f2', name: 'more', type: 'text', visibility: cond('agree', 'contains', 'x') }),
    ];
    const issues = validateRuleReferences(fields);
    expect(issues.some((m) => m.includes('is not valid for field type'))).toBe(true);
  });
});

describe('visibleFields', () => {
  const field = (name: string, visibility?: Rule): FormField =>
    ({
      id: name,
      type: 'text',
      label: name,
      name,
      required: false,
      ...(visibility ? { visibility } : {}),
    }) as FormField;

  it('returns all fields when none have a visibility rule', () => {
    const fields = [field('a'), field('b'), field('c')];
    expect(visibleFields(fields, {})).toEqual(fields);
  });

  it('includes a field whose rule evaluates to true', () => {
    const f = field('city', cond('country', 'equals', 'SA'));
    const fields = [field('country'), f];
    expect(visibleFields(fields, { country: 'SA' })).toContain(f);
  });

  it('excludes a field whose rule evaluates to false', () => {
    const f = field('city', cond('country', 'equals', 'SA'));
    const fields = [field('country'), f];
    expect(visibleFields(fields, { country: 'US' })).not.toContain(f);
  });

  it('returns only the visible subset when some fields are hidden', () => {
    const country = field('country');
    const city = field('city', cond('country', 'equals', 'SA'));
    const region = field('region', cond('country', 'equals', 'US'));
    const result = visibleFields([country, city, region], { country: 'SA' });
    expect(result).toEqual([country, city]);
  });

  it('evaluates in array order so backward references resolve against given answers', () => {
    // city depends on the earlier `country` answer; forward-pass order is correct.
    const country = field('country');
    const city = field('city', group('AND', [cond('country', 'notEquals', 'SA')]));
    expect(visibleFields([country, city], { country: 'SA' })).toEqual([country]);
    expect(visibleFields([country, city], { country: 'US' })).toEqual([country, city]);
  });

  it('cascaded chain: hidden upstream field does not expose downstream dependent', () => {
    // A → B (visible when A equals 'x') → C (visible when B equals 'y')
    // If A='z': B is hidden. A smuggled B='y' must NOT make C visible.
    const a = field('a');
    const b = field('b', cond('a', 'equals', 'x'));
    const c = field('c', cond('b', 'equals', 'y'));
    // B is hidden (A='z'), so C must also be hidden regardless of smuggled B value.
    expect(visibleFields([a, b, c], { a: 'z', b: 'y' })).toEqual([a]);
    // B is visible (A='x') and B='y' → C is visible.
    expect(visibleFields([a, b, c], { a: 'x', b: 'y' })).toEqual([a, b, c]);
    // B is visible but B≠'y' → C is hidden.
    expect(visibleFields([a, b, c], { a: 'x', b: 'n' })).toEqual([a, b]);
  });
});

describe('formSchemaArray parsing of visibility', () => {
  it('accepts a field with a valid visibility rule', () => {
    const input = [
      { id: 'f1', type: 'text', label: 'Country', name: 'country', required: false },
      {
        id: 'f2',
        type: 'text',
        label: 'City',
        name: 'city',
        required: false,
        visibility: group('AND', [cond('country', 'equals', 'SA')]),
      },
    ];
    const result = formSchemaArray.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects a malformed visibility rule', () => {
    const input = [
      {
        id: 'f1',
        type: 'text',
        label: 'City',
        name: 'city',
        required: false,
        visibility: { kind: 'group', combinator: 'MAYBE', rules: [] },
      },
    ];
    expect(formSchemaArray.safeParse(input).success).toBe(false);
  });

  it('rejects a NOT group with two children (arity)', () => {
    const input = [
      { id: 'f1', type: 'text', label: 'A', name: 'a', required: false },
      { id: 'f2', type: 'text', label: 'B', name: 'b', required: false },
      {
        id: 'f3',
        type: 'text',
        label: 'C',
        name: 'c',
        required: false,
        visibility: group('NOT', [cond('a', 'equals', '1'), cond('b', 'equals', '2')]),
      },
    ];
    expect(formSchemaArray.safeParse(input).success).toBe(false);
  });
});
