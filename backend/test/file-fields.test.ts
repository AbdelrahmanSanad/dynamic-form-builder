import { describe, expect, it } from 'vitest';
import {
  buildSubmissionSchema,
  type FormField,
} from '../src/modules/forms/form-fields.js';

// ─── Shared field fixtures ────────────────────────────────────────────────────

const requiredFileField: FormField = {
  id: 'f1',
  type: 'file',
  label: 'Attachment',
  name: 'attachment',
  required: true,
};

const optionalFileField: FormField = {
  id: 'f2',
  type: 'file',
  label: 'Optional doc',
  name: 'doc',
  required: false,
};

const mimeRestrictedField: FormField = {
  id: 'f3',
  type: 'file',
  label: 'Image',
  name: 'image',
  required: true,
  accept: ['image/png', 'image/jpeg'],
};

const multiFileField: FormField = {
  id: 'f4',
  type: 'file',
  label: 'Gallery',
  name: 'gallery',
  required: true,
  maxFiles: 3,
};

const validRef = {
  storageKey: 'abc123',
  filename: 'photo.png',
  mimeType: 'image/png',
  size: 1024,
};

// ─── Required file field ──────────────────────────────────────────────────────

describe('required file field', () => {
  it('rejects a submission when the required file field is absent', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects when the required field is explicitly undefined', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({ attachment: undefined });
    expect(result.success).toBe(false);
  });

  it('accepts a valid file reference object', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({ attachment: validRef });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['attachment']).toMatchObject({
        storageKey: 'abc123',
        filename: 'photo.png',
        mimeType: 'image/png',
        size: 1024,
      });
    }
  });

  it('strips unknown keys from a valid submission', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({ attachment: validRef, injected: 'bad' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('injected');
    }
  });

  it('optional file field allows the field to be absent', () => {
    const schema = buildSubmissionSchema([optionalFileField]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── Reference shape validation ───────────────────────────────────────────────

describe('file reference shape', () => {
  it('rejects a reference missing storageKey', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({
      attachment: { filename: 'x.png', mimeType: 'image/png', size: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a reference missing filename', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({
      attachment: { storageKey: 'k1', mimeType: 'image/png', size: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a reference missing mimeType', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({
      attachment: { storageKey: 'k1', filename: 'x.png', size: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a reference with a negative size', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({
      attachment: { storageKey: 'k1', filename: 'x.png', mimeType: 'image/png', size: -1 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a reference with size 0', () => {
    const schema = buildSubmissionSchema([requiredFileField]);
    const result = schema.safeParse({
      attachment: { storageKey: 'k1', filename: 'x.png', mimeType: 'image/png', size: 0 },
    });
    expect(result.success).toBe(true);
  });
});

// ─── MIME type constraint (server-side validation via buildSubmissionSchema) ──
//
// Note: the `accept` constraint is enforced *before* the reference is stored —
// in `SubmissionsService.createForSlugMultipart`.  `buildSubmissionSchema` itself
// validates the *shape* of the stored reference (storageKey/filename/mimeType/size)
// not the MIME value, because by the time it runs the file is already on disk.
// These tests document the expected behavior and verify the reference shape
// passes through correctly regardless of mimeType value.

describe('MIME-restricted file field — reference shape round-trip', () => {
  it('accepts a reference whose mimeType matches the accept list', () => {
    const schema = buildSubmissionSchema([mimeRestrictedField]);
    const result = schema.safeParse({
      image: { storageKey: 'k2', filename: 'photo.png', mimeType: 'image/png', size: 500 },
    });
    expect(result.success).toBe(true);
  });

  it('still accepts the shape even if mimeType is not in accept (enforcement is pre-storage)', () => {
    // The schema itself does not filter by MIME — that is done in the service
    // before calling buildSubmissionSchema.  We confirm the schema never rejects
    // a valid reference object regardless of mimeType content.
    const schema = buildSubmissionSchema([mimeRestrictedField]);
    const result = schema.safeParse({
      image: { storageKey: 'k3', filename: 'file.pdf', mimeType: 'application/pdf', size: 200 },
    });
    expect(result.success).toBe(true);
  });
});

// ─── maxFiles > 1: array case ─────────────────────────────────────────────────

describe('multi-file field (maxFiles > 1)', () => {
  it('requires at least one reference when required', () => {
    const schema = buildSubmissionSchema([multiFileField]);
    const result = schema.safeParse({ gallery: [] });
    expect(result.success).toBe(false);
  });

  it('accepts an array of valid references', () => {
    const schema = buildSubmissionSchema([multiFileField]);
    const result = schema.safeParse({
      gallery: [
        { storageKey: 'k4', filename: 'a.png', mimeType: 'image/png', size: 100 },
        { storageKey: 'k5', filename: 'b.png', mimeType: 'image/png', size: 200 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data['gallery'])).toBe(true);
    }
  });

  it('rejects when the array contains a malformed reference', () => {
    const schema = buildSubmissionSchema([multiFileField]);
    const result = schema.safeParse({
      gallery: [
        { storageKey: 'k4', filename: 'a.png', mimeType: 'image/png', size: 100 },
        { storageKey: 'k5' }, // missing filename/mimeType/size
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when a single-object reference is supplied instead of an array', () => {
    const schema = buildSubmissionSchema([multiFileField]);
    const result = schema.safeParse({
      gallery: { storageKey: 'k4', filename: 'a.png', mimeType: 'image/png', size: 100 },
    });
    expect(result.success).toBe(false);
  });
});

// ─── Mixed form (file + text fields) ─────────────────────────────────────────

describe('mixed form with file and text fields', () => {
  const fields: FormField[] = [
    { id: 't1', type: 'text', label: 'Name', name: 'name', required: true },
    requiredFileField,
  ];

  it('rejects when text field is missing', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({ attachment: validRef });
    expect(result.success).toBe(false);
  });

  it('rejects when file field is missing', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({ name: 'Ada' });
    expect(result.success).toBe(false);
  });

  it('accepts when both fields are present', () => {
    const schema = buildSubmissionSchema(fields);
    const result = schema.safeParse({ name: 'Ada', attachment: validRef });
    expect(result.success).toBe(true);
  });
});
