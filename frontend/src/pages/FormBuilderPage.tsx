import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { formsApi, type FormInput } from '../api/forms';
import { FieldEditor } from '../components/FieldEditor';
import { Button, Card, Input, Label, Spinner, Textarea } from '../components/ui';
import type { FormField } from '../lib/form-fields';
import { formFieldSchema } from '../lib/form-fields';
import { z } from 'zod';
import { Alert } from './LoginPage';

const fieldsSchema = z.array(formFieldSchema);

export function FormBuilderPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsApi.get(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? '');
      setFields(existing.schema);
    }
  }, [existing]);

  const save = useMutation({
    mutationFn: (input: FormInput) =>
      isEdit ? formsApi.update(id!, input) : formsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate('/dashboard');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to save form'),
  });

  const handleSave = () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    const parsed = fieldsSchema.safeParse(fields);
    if (!parsed.success) {
      setError('Some fields are invalid. Check field names and options.');
      return;
    }
    const names = fields.map((f) => f.name);
    if (new Set(names).size !== names.length) {
      setError('Field names must be unique.');
      return;
    }
    const input: FormInput = { title: title.trim(), schema: fields };
    const trimmedDescription = description.trim();
    if (trimmedDescription) input.description = trimmedDescription;
    save.mutate(input);
  };

  if (isEdit && isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Edit form' : 'New form'}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save form'}
          </Button>
        </div>
      </div>

      {error && <Alert message={error} />}

      <Card className="space-y-4 p-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Fields</h2>
        <FieldEditor fields={fields} onChange={setFields} />
      </div>
    </div>
  );
}
