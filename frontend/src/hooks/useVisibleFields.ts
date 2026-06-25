import { useEffect, useRef } from 'react';
import type { UseFormSetValue, FieldValues } from 'react-hook-form';
import { visibleFields, defaultValueForField, type FormField } from '../lib/form-fields';

export function useVisibleFields(
  fields: FormField[],
  values: Record<string, unknown>,
  setValue: UseFormSetValue<FieldValues>,
): FormField[] {
  const shown = visibleFields(fields, values);
  const shownNames = new Set(shown.map((f) => f.name));
  // Initialized to the initial visible set (not all fields) so no spurious resets on mount.
  const prevShownNames = useRef<Set<string>>(shownNames);

  useEffect(() => {
    for (const field of fields) {
      if (prevShownNames.current.has(field.name) && !shownNames.has(field.name)) {
        const def = defaultValueForField(field);
        if (def !== undefined) {
          setValue(field.name, def);
        }
      }
    }
    prevShownNames.current = shownNames;
  });

  return shown;
}
