import { describe, expect, it } from 'vitest';
import {
  buildSubmissionSchema,
  formSchemaArray,
  type FormField,
} from '../src/modules/forms/form-fields.js';

const fields: FormField[] = [
  { id: '1', type: 'text', label: 'Name', name: 'name', required: true },
  { id: '2', type: 'email', label: 'Email', name: 'email', required: true },
  { id: '3', type: 'number', label: 'Age', name: 'age', required: false, validation: { min: 0, max: 120 } },
  {
    id: '4',
    type: 'select',
    label: 'Plan',
    name: 'plan',
    required: true,
    options: [
      { label: 'Free', value: 'free' },
      { label: 'Pro', value: 'pro' },
    ],
  },
  { id: '5', type: 'checkbox', label: 'Accept terms', name: 'accept', required: true },
];

describe('buildSubmissionSchema', () => {
  it('accepts a valid submission and strips unknown keys', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.parse({
      name: 'Ada',
      email: 'ada@example.com',
      age: '30', // coerced from string
      plan: 'pro',
      accept: true,
      injected: 'should be removed',
    });

    expect(result).toMatchObject({ name: 'Ada', email: 'ada@example.com', age: 30, plan: 'pro' });
    expect(result).not.toHaveProperty('injected');
  });

  it('rejects a missing required field', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({ email: 'ada@example.com', plan: 'pro', accept: true });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range number', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      age: '200',
      plan: 'pro',
      accept: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a select value outside the allowed options', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      plan: 'enterprise',
      accept: true,
    });
    expect(result.success).toBe(false);
  });

  it('requires a single checkbox to be true when required', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      plan: 'pro',
      accept: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('formSchemaArray', () => {
  it('rejects duplicate field names', () => {
    const result = formSchemaArray.safeParse([
      { id: '1', type: 'text', label: 'A', name: 'dup', required: false },
      { id: '2', type: 'text', label: 'B', name: 'dup', required: false },
    ]);
    expect(result.success).toBe(false);
  });

  it('requires options for choice fields', () => {
    const result = formSchemaArray.safeParse([
      { id: '1', type: 'select', label: 'Choose', name: 'choose', required: true },
    ]);
    expect(result.success).toBe(false);
  });
});
