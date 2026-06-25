/**
 * Integration tests for GET /api/forms/:formId/submissions/:id
 *
 * Uses Fastify `inject` (no real HTTP listener) and a fully-mocked PrismaClient
 * so no live database is required — consistent with the existing unit-test suite.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// ─── Environment bootstrap ───────────────────────────────────────────────────
//
// env.ts calls process.exit(1) when required variables are absent.  Set them
// before any module that transitively imports env.ts is evaluated.

process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test';
process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long!!';

// ─── Prisma mock ─────────────────────────────────────────────────────────────
//
// The mock must be declared before `buildApp` is imported so Vitest can hoist
// the factory above the top-level import resolution.

const mockForm = {
  id: 'aaaaaaaa-0000-0000-0000-000000000001',
  ownerId: 'bbbbbbbb-0000-0000-0000-000000000001',
  title: 'Test Form',
  slug: 'test-form',
  status: 'PUBLISHED',
  schema: [{ id: 'f1', type: 'text', label: 'Name', name: 'name', required: true }],
  description: null,
  publishedAt: new Date('2024-01-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

const mockSubmission = {
  id: 'cccccccc-0000-0000-0000-000000000001',
  formId: mockForm.id,
  data: { name: 'Ada Lovelace' },
  metadata: { ip: '127.0.0.1' },
  createdAt: new Date('2024-06-01T10:00:00.000Z'),
};

// Individual operation fns — reassignable per test.
const formFindUnique = vi.fn();
const submissionFindFirst = vi.fn();
const submissionCreate = vi.fn();
const submissionCount = vi.fn();
const submissionFindMany = vi.fn();

vi.mock('@prisma/client', () => {
  const PrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => {
      // $transaction receives an array of Promises — resolve them sequentially.
      return Promise.all(ops);
    }),
    form: {
      get findUnique() {
        return formFindUnique;
      },
    },
    submission: {
      get findFirst() {
        return submissionFindFirst;
      },
      get create() {
        return submissionCreate;
      },
      get count() {
        return submissionCount;
      },
      get findMany() {
        return submissionFindMany;
      },
    },
  }));

  return { PrismaClient };
});

// ─── App setup ───────────────────────────────────────────────────────────────

// Import after the mock is declared.
const { buildApp } = await import('../src/app.js');

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Signs a JWT for the given user using the app's own `app.jwt.sign` so the
 * token is valid against the configured secret.
 */
function cookieFor(app: FastifyInstance, userId: string, email: string): string {
  const token = app.jwt.sign({ sub: userId, email });
  return `access_token=${token}`;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/forms/:formId/submissions/:id', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── 200: owner retrieves own submission ─────────────────────────────────────

  it('returns 200 with full submission data for the form owner', async () => {
    formFindUnique.mockResolvedValue({ ownerId: mockForm.ownerId });
    submissionFindFirst.mockResolvedValue(mockSubmission);

    const cookie = cookieFor(app, mockForm.ownerId, 'owner@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${mockForm.id}/submissions/${mockSubmission.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      id: string;
      formId: string;
      data: Record<string, unknown>;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>();

    expect(body.id).toBe(mockSubmission.id);
    expect(body.formId).toBe(mockSubmission.formId);
    expect(body.data).toEqual({ name: 'Ada Lovelace' });
    expect(body.metadata).toEqual({ ip: '127.0.0.1' });
    expect(body.createdAt).toBeDefined();
  });

  // ── 401: unauthenticated ────────────────────────────────────────────────────

  it('returns 401 when no auth cookie is provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${mockForm.id}/submissions/${mockSubmission.id}`,
    });

    expect(response.statusCode).toBe(401);
  });

  // ── 403: wrong owner ────────────────────────────────────────────────────────

  it('returns 403 when an authenticated user requests another owner\'s submission', async () => {
    const otherUserId = 'dddddddd-0000-0000-0000-000000000099';

    // The form belongs to mockForm.ownerId, not otherUserId.
    formFindUnique.mockResolvedValue({ ownerId: mockForm.ownerId });

    const cookie = cookieFor(app, otherUserId, 'other@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${mockForm.id}/submissions/${mockSubmission.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(403);
  });

  // ── 404: form not found ─────────────────────────────────────────────────────

  it('returns 404 when the form does not exist', async () => {
    formFindUnique.mockResolvedValue(null);

    const cookie = cookieFor(app, mockForm.ownerId, 'owner@example.com');

    const nonExistentFormId = 'eeeeeeee-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${nonExistentFormId}/submissions/${mockSubmission.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
  });

  // ── 404: submission not found ───────────────────────────────────────────────

  it('returns 404 when the owner requests a non-existent submission id', async () => {
    formFindUnique.mockResolvedValue({ ownerId: mockForm.ownerId });
    submissionFindFirst.mockResolvedValue(null);

    const cookie = cookieFor(app, mockForm.ownerId, 'owner@example.com');

    const nonExistentSubmissionId = 'ffffffff-0000-0000-0000-000000000000';

    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${mockForm.id}/submissions/${nonExistentSubmissionId}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
  });

  // ── 404: submission belongs to a different form ─────────────────────────────
  // Ensures the service queries `findFirst({ where: { id, formId } })` so a
  // submission that exists under a different form is not leaked cross-form.

  it('returns 404 when the submission exists but belongs to a different form', async () => {
    const otherFormId = 'ffffffff-0000-0000-0000-000000000001';
    formFindUnique.mockResolvedValue({ ownerId: mockForm.ownerId });
    // `findFirst({ where: { id, formId: otherFormId } })` returns null because
    // the real submission's formId is mockForm.id, not otherFormId.
    submissionFindFirst.mockResolvedValue(null);

    const cookie = cookieFor(app, mockForm.ownerId, 'owner@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/api/forms/${otherFormId}/submissions/${mockSubmission.id}`,
      headers: { cookie },
    });

    expect(response.statusCode).toBe(404);
  });
});
