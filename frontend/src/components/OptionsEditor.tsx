import { Button, Input, Label } from './ui';

interface OptionsEditorProps {
  options: { label: string; value: string }[];
  onChange: (options: { label: string; value: string }[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const update = (i: number, label: string) => {
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    onChange(options.map((o, idx) => (idx === i ? { label, value: value || `option_${i + 1}` } : o)));
  };
  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }]);

  return (
    <div className="mt-3">
      <Label>Options</Label>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2">
            <Input value={opt.label} onChange={(e) => update(i, e.target.value)} />
            <Button type="button" variant="ghost" onClick={() => remove(i)}>
              ✕
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={add} className="mt-2">
        + Add option
      </Button>
    </div>
  );
}
