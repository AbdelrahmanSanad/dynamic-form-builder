/**
 * Integration tests for server-side conditional-visibility enforcement on
 * POST /api/public/forms/:slug/submissions (S-15).
 *
 * Uses Fastify `inject` (no real HTTP listener) and a fully-mocked PrismaClient
 * so no live database is required — consistent with the existing test suite.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ─── Environment bootstrap ───────────────────────────────────────────────────

process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long!!';

// ─── Prisma mock ─────────────────────────────────────────────────────────────

const formFindUnique = vi.fn();
const submissionCreate = vi.fn();

vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => Promise.all(ops)),
    form: {
      get findUnique() {
        return formFindUnique;
      },
    },
    submission: {
      get create() {
        return submissionCreate;
      },
    },
  }));

  return { PrismaClient };
});

// Import after the mock is declared.
const { buildApp } = await import('../src/app.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORM_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const OWNER_ID = 'bbbbbbbb-0000-0000-0000-000000000001';

/** A published form whose `city` field is visible only when country !== 'SA'. */
function conditionalForm() {
  return {
    id: FORM_ID,
    ownerId: OWNER_ID,
    title: 'Conditional Form',
    slug: 'conditional-form',
    status: 'PUBLISHED',
    description: null,
    schema: [
      { id: 'f1', type: 'text', label: 'Country', name: 'country', required: true },
      {
        id: 'f2',
        type: 'text',
        label: 'City',
        name: 'city',
        required: true,
        visibility: { kind: 'condition', fieldName: 'country', operator: 'notEquals', value: 'SA' },
      },
    ],
    publishedAt: new Date('2024-01-01T00:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };
}

/** A published form with one required, always-visible field. */
function plainForm() {
  return {
    ...conditionalForm(),
    schema: [{ id: 'f1', type: 'text', label: 'Country', name: 'country', required: true }],
  };
}

function postSubmission(app: FastifyInstance, slug: string, body: unknown) {
  return app.inject({
    method: 'POST',
    url: `/api/public/forms/${slug}/submissions`,
    headers: { 'content-type': 'application/json' },
    payload: body,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/public/forms/:slug/submissions — visibility enforcement', () => {
  let app: FastifyInstance;
  let stored: Record<string, unknown> | undefined;

  beforeEach(async () => {
    vi.clearAllMocks();
    stored = undefined;
    submissionCreate.mockImplementation(({ data: { data } }: { data: { data: Record<string, unknown> } }) => {
      stored = data;
      return Promise.resolve({
        id: 'cccccccc-0000-0000-0000-000000000001',
        formId: FORM_ID,
        data,
        metadata: null,
        createdAt: new Date(),
      });
    });
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // Scenario A — Hidden required field: submit succeeds without it.
  it('A: succeeds (201) when a hidden required field is omitted', async () => {
    formFindUnique.mockResolvedValue(conditionalForm());

    const res = await postSubmission(app, 'conditional-form', { country: 'SA' });

    expect(res.statusCode).toBe(201);
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty('city');
    expect(stored).toMatchObject({ country: 'SA' });
  });

  // Scenario B — Smuggled answer for a hidden field is stripped.
  it('B: strips a smuggled answer for a hidden field (201, not stored)', async () => {
    formFindUnique.mockResolvedValue(conditionalForm());

    const res = await postSubmission(app, 'conditional-form', { country: 'SA', city: 'Riyadh' });

    expect(res.statusCode).toBe(201);
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty('city');
  });

  // Scenario C — Visible required field missing → 422.
  it('C: returns 422 when a visible required field is missing', async () => {
    formFindUnique.mockResolvedValue(plainForm());

    const res = await postSubmission(app, 'conditional-form', {});

    expect(res.statusCode).toBe(422);
    expect(submissionCreate).not.toHaveBeenCalled();
  });

  // Scenario D — Visible required field present → 201, both stored.
  it('D: succeeds (201) and stores both fields when the conditional field is visible', async () => {
    formFindUnique.mockResolvedValue(conditionalForm());

    const res = await postSubmission(app, 'conditional-form', { country: 'US', city: 'NYC' });

    expect(res.statusCode).toBe(201);
    expect(stored).toBeDefined();
    expect(stored).toMatchObject({ country: 'US', city: 'NYC' });
  });
});
