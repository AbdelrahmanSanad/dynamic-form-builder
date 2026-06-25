import { Controller } from 'react-hook-form';
import type { Control, FieldValues, UseFormRegister } from 'react-hook-form';
import type { FormField } from '../lib/form-fields';
import { FileFieldInput } from './FileFieldInput';
import { Input, Select, Textarea } from './ui';

interface FieldControlProps {
  field: FormField;
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
}

export function FieldControl({ field, register, control }: FieldControlProps) {
  switch (field.type) {
    case 'textarea':
      return <Textarea id={field.name} rows={4} placeholder={field.placeholder} {...register(field.name)} />;

    case 'number':
      return <Input id={field.name} type="number" placeholder={field.placeholder} {...register(field.name)} />;

    case 'email':
      return <Input id={field.name} type="email" placeholder={field.placeholder} {...register(field.name)} />;

    case 'date':
      return <Input id={field.name} type="date" {...register(field.name)} />;

    case 'select':
      return (
        <Select id={field.name} defaultValue="" {...register(field.name)}>
          <option value="" disabled>
            {field.placeholder ?? 'Select an option'}
          </option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );

    case 'radio':
      return (
        <div className="space-y-1.5">
          {field.options?.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input type="radio" value={opt.value} {...register(field.name)} />
              {opt.label}
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register(field.name)} />
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </label>
      );

    case 'checkboxes':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: ctrl }) => {
            const value = (ctrl.value as string[] | undefined) ?? [];
            const toggle = (optValue: string, checked: boolean) => {
              ctrl.onChange(checked ? [...value, optValue] : value.filter((v) => v !== optValue));
            };
            return (
              <div className="space-y-1.5">
                {field.options?.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={value.includes(opt.value)}
                      onChange={(e) => toggle(opt.value, e.target.checked)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            );
          }}
        />
      );

    case 'file':
      return (
        <Controller
          control={control}
          name={field.name}
          render={({ field: ctrl }) => <FileFieldInput field={field} ctrl={ctrl} />}
        />
      );

    default:
      return <Input id={field.name} type="text" placeholder={field.placeholder} {...register(field.name)} />;
  }
}
