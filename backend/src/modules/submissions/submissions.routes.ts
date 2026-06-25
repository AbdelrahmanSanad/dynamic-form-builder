import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { NotFoundError } from '../../lib/errors.js';
import {
  fileDownloadParamsSchema,
  submissionFormParamsSchema,
  submissionIdParamsSchema,
  submissionListQuerySchema,
  submissionListSchema,
  submissionSchema,
} from './submissions.schemas.js';
import { SubmissionsService } from './submissions.service.js';

/**
 * Owner-scoped submission review. Mounted under `/forms/:formId/submissions`.
 * Public submission *creation* lives in the public module.
 */
export async function submissionRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>();
  // Pass storage so the download route can stream files.
  const service = new SubmissionsService(app.prisma, app.storage);

  router.addHook('onRequest', app.authenticate);
  const security = [{ cookieAuth: [] }];

  router.get(
    '/forms/:formId/submissions',
    {
      schema: {
        tags: ['submissions'],
        summary: 'List submissions for a form (paginated)',
        security,
        params: submissionFormParamsSchema,
        querystring: submissionListQuerySchema,
        response: { 200: submissionListSchema },
      },
    },
    async (request, reply) => {
      const result = await service.listForForm(
        request.user.sub,
        request.params.formId,
        request.query,
      );
      return reply.send(result);
    },
  );

  router.get(
    '/forms/:formId/submissions/:id',
    {
      schema: {
        tags: ['submissions'],
        summary: 'Get a single submission',
        security,
        params: submissionIdParamsSchema,
        response: { 200: submissionSchema },
      },
    },
    async (request, reply) => {
      const submission = await service.getOne(
        request.user.sub,
        request.params.formId,
        request.params.id,
      );
      return reply.send(submission);
    },
  );

  router.get(
    '/forms/:formId/submissions/:id/files/:storageKey',
    {
      schema: {
        tags: ['submissions'],
        summary: 'Download an uploaded file (owner only)',
        security,
        params: fileDownloadParamsSchema,
        // No response schema — we stream raw bytes.
      },
    },
    async (request, reply) => {
      const { formId, id, storageKey } = request.params;

      // Asserts ownership + confirms the key belongs to this submission.
      const ref = await service.getSubmissionFileRef(
        request.user.sub,
        formId,
        id,
        storageKey,
      );

      // Confirm the file still exists on disk before opening a stream.
      // createReadStream is lazy and does NOT return null for a missing file —
      // the error only surfaces when the stream is consumed, producing an
      // ungraceful response. stat() is the reliable missing-file guard.
      const fileStat = await app.storage.stat(ref.storageKey);
      if (!fileStat) {
        throw new NotFoundError('File not found in storage');
      }

      const readStream = app.storage.createReadStream(ref.storageKey);

      // Sanitize the original filename for the ASCII Content-Disposition param.
      const safeName = ref.filename.replace(/[^\w._-]/g, '_');

      void reply.header('Content-Type', ref.mimeType);
      // RFC 5987: include both the ASCII fallback and the UTF-8 percent-encoded
      // original so non-ASCII filenames survive across all HTTP clients.
      void reply.header(
        'Content-Disposition',
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(ref.filename)}`,
      );
      return reply.send(readStream);
    },
  );
}
