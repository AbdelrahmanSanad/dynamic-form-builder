import { z } from 'zod';

/**
 * Frontend mirror of the backend's dynamic field model. Kept in sync with
 * `backend/src/modules/forms/form-fields.ts`. The same definitions drive both
 * the builder UI and the runtime renderer/validator for public forms.
 */

export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'date',
  'select',
  'radio',
  'checkbox',
  'checkboxes',
  'file',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  email: 'Email',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
  radio: 'Single choice',
  checkbox: 'Checkbox',
  checkboxes: 'Multiple choice',
  file: 'File Upload',
};

export const OPTION_FIELD_TYPES: ReadonlySet<FieldType> = new Set(['select', 'radio', 'checkboxes']);

export const fieldOptionSchema = z.object({
  label: z.string().min(1).max(200),
  value: z.string().min(1).max(200),
});

export const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().max(500).optional(),
});

// ── Conditional logic: operator catalog + rule schema + evaluator ───────────

/**
 * The single authority for which operators apply to which question type. The
 * builder UI derives its dropdown from this, and the evaluator/validator switch
 * on it.
 */
export const OPERATORS = {
  text: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  textarea: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  email: ['equals', 'notEquals', 'contains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'notEq', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  date: ['eq', 'notEq', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  radio: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  checkbox: ['isTrue', 'isFalse'],
  checkboxes: ['includes', 'notIncludes', 'isEmpty', 'isNotEmpty'],
  file: ['isPresent', 'isAbsent'],
} as const satisfies Record<FieldType, readonly string[]>;

export type Condition = {
  kind: 'condition';
  fieldName: string;
  operator: string;
  value?: unknown;
};

export type Group = {
  kind: 'group';
  combinator: 'AND' | 'OR' | 'NOT';
  rules: Rule[];
};

export type Rule = Condition | Group;

export const ruleSchema: z.ZodType<Rule> = z.lazy(() =>
  z.discriminatedUnion('kind', [conditionSchema, groupSchema]).superRefine((rule, ctx) => {
    if (rule.kind === 'group' && rule.combinator === 'NOT' && rule.rules.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A NOT group must contain exactly one rule',
        path: ['rules'],
      });
    }
  }),
);

const conditionSchema = z.object({
  kind: z.literal('condition'),
  fieldName: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown().optional(),
});

const groupSchema = z.object({
  kind: z.literal('group'),
  combinator: z.enum(['AND', 'OR', 'NOT']),
  rules: z.array(ruleSchema).min(1).max(20),
});

/** True if a value counts as "empty" for emptiness operators. */
function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Pure, total evaluator for a visibility rule tree. Never throws; unknown
 * operators evaluate to false.
 */
export function evaluate(rule: Rule, answers: Record<string, unknown>): boolean {
  if (rule.kind === 'group') {
    switch (rule.combinator) {
      case 'AND':
        return rule.rules.every((r) => evaluate(r, answers));
      case 'OR':
        return rule.rules.some((r) => evaluate(r, answers));
      case 'NOT': {
        const child = rule.rules[0];
        return child === undefined ? false : !evaluate(child, answers);
      }
      default:
        return false;
    }
  }

  const value = answers[rule.fieldName];
  const target = rule.value;

  // Emptiness/presence operators handle undefined/null explicitly.
  switch (rule.operator) {
    case 'isEmpty':
    case 'isAbsent':
      return isEmptyValue(value);
    case 'isNotEmpty':
    case 'isPresent':
      return !isEmptyValue(value);
  }

  // All remaining operators require a concrete value; undefined/null → false.
  if (value === undefined || value === null) return false;

  switch (rule.operator) {
    case 'isTrue':
      return value === true;
    case 'isFalse':
      return value === false;
    case 'equals':
      return String(value) === String(target);
    case 'notEquals':
      return String(value) !== String(target);
    case 'contains':
      return String(value).includes(String(target ?? ''));
    case 'startsWith':
      return String(value).startsWith(String(target ?? ''));
    case 'endsWith':
      return String(value).endsWith(String(target ?? ''));
    case 'eq':
    case 'notEq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      // Try numeric coercion first; fall back to Date for ISO date strings.
      const toComparable = (v: unknown): number => {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
        return new Date(String(v)).getTime();
      };
      const a = toComparable(value);
      const b = toComparable(target);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      switch (rule.operator) {
        case 'eq':
          return a === b;
        case 'notEq':
          return a !== b;
        case 'gt':
          return a > b;
        case 'gte':
          return a >= b;
        case 'lt':
          return a < b;
        case 'lte':
          return a <= b;
        default:
          return false;
      }
    }
    case 'includes':
      return Array.isArray(value) && value.includes(target);
    case 'notIncludes':
      return Array.isArray(value) ? !value.includes(target) : false;
    default:
      return false;
  }
}

/**
 * Returns the subset of fields that are visible given the current answers.
 * Fields with no visibility rule are always included.
 *
 * Evaluated in a single forward pass: each field's rule is tested against only
 * the answers of fields already determined to be visible. This prevents a
 * smuggled answer for a hidden upstream field from incorrectly exposing a
 * downstream field that depends on it.
 */
export function visibleFields(
  fields: FormField[],
  answers: Record<string, unknown>,
): FormField[] {
  const visibleNames = new Set<string>();
  for (const field of fields) {
    const pruned: Record<string, unknown> = {};
    for (const name of visibleNames) {
      if (name in answers) pruned[name] = answers[name];
    }
    if (field.visibility === undefined || evaluate(field.visibility, pruned)) {
      visibleNames.add(field.name);
    }
  }
  return fields.filter((f) => visibleNames.has(f.name));
}

/**
 * Validates that every condition in every field's visibility rule references a
 * field that precedes it and uses an operator legal for that field's type.
 * Returns a list of human-readable issue messages (empty ⇒ valid).
 */
export function validateRuleReferences(fields: FormField[]): string[] {
  const issues: string[] = [];
  const indexByName = new Map<string, number>();
  fields.forEach((f, i) => indexByName.set(f.name, i));

  fields.forEach((field, fieldIndex) => {
    if (!field.visibility) return;

    const walk = (rule: Rule): void => {
      if (rule.kind === 'group') {
        rule.rules.forEach(walk);
        return;
      }
      const targetIndex = indexByName.get(rule.fieldName);
      if (targetIndex === undefined) {
        issues.push(`Field '${field.name}': rule references unknown field '${rule.fieldName}'`);
        return;
      }
      if (targetIndex >= fieldIndex) {
        issues.push(
          `Field '${field.name}': rule references field '${rule.fieldName}' which does not precede it`,
        );
        return;
      }
      const target = fields[targetIndex]!;
      const allowed = OPERATORS[target.type] as readonly string[];
      if (!allowed.includes(rule.operator)) {
        issues.push(
          `Field '${field.name}': operator '${rule.operator}' is not valid for field type '${target.type}'`,
        );
      }
    };

    walk(field.visibility);
  });

  return issues;
}

export const formFieldSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(FIELD_TYPES),
  label: z.string().min(1).max(200),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Use letters, numbers, and underscores only'),
  required: z.boolean(),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  options: z.array(fieldOptionSchema).max(100).optional(),
  validation: fieldValidationSchema.optional(),
  // File-field constraints — mirrored from backend formFieldSchema
  /** Allowed MIME types (e.g. ["image/png", "application/pdf"]). Empty/absent = any type. */
  accept: z.array(z.string().min(1)).optional(),
  /** Per-file size cap in bytes. */
  maxSizeBytes: z.number().int().positive().optional(),
  /** Maximum number of files. Default 1. */
  maxFiles: z.number().int().positive().optional(),
  /** Optional conditional-visibility rule. Absent ⇒ always visible. */
  visibility: ruleSchema.optional(),
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormFieldSchema = FormField[];

/**
 * Builds a react-hook-form-compatible Zod resolver schema for a public form,
 * mirroring the backend's validation so users get instant client-side feedback.
 */
export function buildSubmissionSchema(fields: FormField[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const field of fields) {
    let validator = fieldToValidator(field);
    if (!field.required && field.type !== 'checkbox') {
      validator = validator.optional();
    }
    shape[field.name] = validator;
  }

  return z.object(shape);
}

function fieldToValidator(field: FormField): z.ZodTypeAny {
  const v = field.validation;
  switch (field.type) {
    case 'text':
    case 'textarea': {
      let s = z.string();
      if (field.required) s = s.min(1, `${field.label} is required`);
      if (v?.minLength !== undefined) s = s.min(v.minLength, `Minimum ${v.minLength} characters`);
      if (v?.maxLength !== undefined) s = s.max(v.maxLength, `Maximum ${v.maxLength} characters`);
      if (v?.pattern) s = s.regex(new RegExp(v.pattern), 'Invalid format');
      return s;
    }
    case 'email': {
      if (!field.required) {
        return z.string().email('Enter a valid email').or(z.literal(''));
      }
      return z.string().min(1, `${field.label} is required`).email('Enter a valid email');
    }
    case 'number': {
      let n = z.coerce.number({ invalid_type_error: `${field.label} must be a number` });
      if (v?.min !== undefined) n = n.min(v.min, `Minimum ${v.min}`);
      if (v?.max !== undefined) n = n.max(v.max, `Maximum ${v.max}`);
      return field.required ? n : n.optional();
    }
    case 'date': {
      return field.required ? z.string().min(1, `${field.label} is required`) : z.string();
    }
    case 'select':
    case 'radio': {
      const allowed = (field.options ?? []).map((o) => o.value);
      const base = z.string().refine((val) => allowed.includes(val), 'Select an option');
      return field.required ? base : z.string().optional();
    }
    case 'checkbox': {
      return field.required
        ? z.boolean().refine((b) => b === true, `${field.label} is required`)
        : z.boolean().optional();
    }
    case 'checkboxes': {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      const base = z.array(z.string());
      const sized = field.required ? base.min(1, `${field.label} requires a selection`) : base;
      return sized.refine((vals) => vals.every((val) => allowed.has(val)), 'Invalid selection');
    }
    case 'file': {
      // NOTE: Legitimate mirror divergence — the backend validates FileReference
      // objects (storageKey, filename, etc.) because it processes the upload first.
      // The client validates raw File objects from the browser input.
      const fileSchema = z.instanceof(File);
      const accept = field.accept;
      const withType =
        accept && accept.length > 0
          ? fileSchema.refine(
              (f) => accept.includes(f.type),
              `Allowed types: ${accept.join(', ')}`,
            )
          : fileSchema;
      const withSize =
        field.maxSizeBytes !== undefined
          ? withType.refine(
              (f) => f.size <= field.maxSizeBytes!,
              `File must be smaller than ${Math.round(field.maxSizeBytes! / 1_048_576)} MB`,
            )
          : withType;
      const maxFiles = field.maxFiles ?? 1;
      if (maxFiles > 1) {
        const arr = z.array(withSize);
        return field.required ? arr.min(1, `${field.label} is required`) : arr;
      }
      return withSize;
    }
    default:
      return z.unknown();
  }
}

/** Sensible empty default for a newly added field of the given type. */
export function defaultValueForField(field: FormField): unknown {
  switch (field.type) {
    case 'checkbox':
      return false;
    case 'checkboxes':
      return [];
    case 'file':
      return undefined;
    default:
      return '';
  }
}
