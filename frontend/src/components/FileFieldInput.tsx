import { useRef, useState, type ChangeEvent } from 'react';
import type { ControllerRenderProps, FieldValues } from 'react-hook-form';
import type { FormField } from '../lib/form-fields';

interface FileFieldInputProps {
  field: FormField;
  ctrl: ControllerRenderProps<FieldValues, string>;
}

export function FileFieldInput({ field, ctrl }: FileFieldInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  const multiple = (field.maxFiles ?? 1) > 1;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      ctrl.onChange(undefined);
      setFileNames([]);
      return;
    }
    ctrl.onChange(multiple ? files : (files[0] ?? undefined));
    setFileNames(files.map((f) => f.name));
  };

  const clear = () => {
    ctrl.onChange(undefined);
    setFileNames([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <input
        ref={inputRef}
        id={field.name}
        type="file"
        multiple={multiple}
        accept={field.accept && field.accept.length > 0 ? field.accept.join(',') : undefined}
        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
        onChange={handleChange}
      />
      {fileNames.length > 0 && (
        <div className="mt-1 flex items-start gap-2">
          <ul className="flex-1 space-y-0.5 text-xs text-slate-500">
            {fileNames.map((name, i) => (
              <li key={`${i}-${name}`}>{name}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}
      {field.accept && field.accept.length > 0 && (
        <p className="mt-0.5 text-xs text-slate-400">Accepted: {field.accept.join(', ')}</p>
      )}
      {field.maxSizeBytes !== undefined && (
        <p className="mt-0.5 text-xs text-slate-400">
          Max size: {Math.round(field.maxSizeBytes / 1_048_576)} MB
        </p>
      )}
    </div>
  );
}
