import { zodResolver } from '@hookform/resolvers/zod';
import { useLayoutEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
import type { ZodObject, ZodRawShape } from 'zod';
import { buildSubmissionSchema, defaultValueForField, type FormField } from '../lib/form-fields';
import { useVisibleFields } from '../hooks/useVisibleFields';
import { FieldControl } from './FieldControl';
import { Button, FieldError, Label } from './ui';

interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
}

export function DynamicForm({
  fields,
  onSubmit,
  submitting = false,
  submitLabel = 'Submit',
}: DynamicFormProps) {
  const defaultValues = Object.fromEntries(
    fields.map((f) => [f.name, defaultValueForField(f)]),
  ) as DefaultValues<FieldValues>;

  const schemaRef = useRef<ZodObject<ZodRawShape>>(buildSubmissionSchema(fields));

  // Stable resolver that always delegates to the latest schema in schemaRef.
  // Using useRef.current so the function identity never changes.
  const stableResolver = useRef(
    (data: FieldValues, ctx: unknown, options: ResolverOptions<FieldValues>): Promise<ResolverResult<FieldValues>> =>
      zodResolver(schemaRef.current)(data, ctx, options),
  ).current;

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FieldValues>({
    resolver: stableResolver,
    defaultValues,
  });

  const values = watch() as Record<string, unknown>;
  const shown = useVisibleFields(fields, values, setValue);

  // Update schema ref after each commit so the stableResolver reads the correct
  // visible-subset schema without triggering re-renders.
  useLayoutEffect(() => {
    schemaRef.current = buildSubmissionSchema(shown);
  });

  // Store shown in a ref so the submit handler always sees the latest visible
  // set without being recreated each render.
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const handleFormSubmit = handleSubmit((data) => {
    const names = new Set(shownRef.current.map((f) => f.name));
    return onSubmit(Object.fromEntries(Object.entries(data).filter(([k]) => names.has(k))));
  });

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5" noValidate>
      {shown.map((field) => {
        const error = errors[field.name]?.message as string | undefined;
        return (
          <div key={field.id}>
            {field.type !== 'checkbox' && (
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="ml-0.5 text-red-500">*</span>}
              </Label>
            )}
            <FieldControl field={field} register={register} control={control} />
            {field.helpText && <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>}
            <FieldError message={error} />
          </div>
        );
      })}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Submitting…' : submitLabel}
      </Button>
    </form>
  );
}
