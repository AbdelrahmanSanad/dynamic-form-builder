import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { SavedFileRef } from '../submissions/submissions.service.js';
import { SubmissionsService } from '../submissions/submissions.service.js';
import { publicFormSchema, publishedFormListSchema, slugParamsSchema, submitResponseSchema } from './public.schemas.js';
import { PublicService } from './public.service.js';

/**
 * Anonymous, public-facing endpoints for viewing a published form and
 * submitting a response. A tighter rate limit guards the write endpoint.
 */
export async function publicRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>();
  const publicService = new PublicService(app.prisma);
  // Pass the storage service (decorated onto app in buildApp) to the service.
  const submissionsService = new SubmissionsService(app.prisma, app.storage);

  router.get(
    '/forms',
    {
      schema: {
        tags: ['public'],
        summary: 'List all published forms',
        response: { 200: publishedFormListSchema },
      },
    },
    async (_request, reply) => {
      const forms = await publicService.listPublishedForms();
      return reply.send({ forms });
    },
  );

  router.get(
    '/forms/:slug',
    {
      schema: {
        tags: ['public'],
        summary: 'Get a published form by its public slug',
        params: slugParamsSchema,
        response: { 200: publicFormSchema },
      },
    },
    async (request, reply) => {
      const form = await publicService.getPublishedForm(request.params.slug);
      return reply.send(form);
    },
  );

  router.post(
    '/forms/:slug/submissions',
    {
      config: {
        // Stricter limit than the global default to deter submission spam.
        rateLimit: { max: 20, timeWindow: '1 minute' },
      },
      schema: {
        tags: ['public'],
        summary: 'Submit a response to a published form (JSON or multipart)',
        params: slugParamsSchema,
        // No `body` schema on purpose: this route accepts BOTH JSON and
        // multipart/form-data. A Zod body validator would reject multipart
        // requests (which have no JSON body) before the handler runs. The dynamic
        // `buildSubmissionSchema` is the single authoritative validator for both
        // paths, so field-level validation is not duplicated here.
        response: { 201: submitResponseSchema },
      },
    },
    async (request, reply) => {
      const slug = request.params.slug;
      const metaOpts = {
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? undefined,
      };

      if (request.isMultipart()) {
        // ── Multipart path ─────────────────────────────────────────────────
        // Files MUST be saved to storage inside the `for await` loop — busboy
        // will not advance past a file part until its stream is fully consumed.
        // Deferring stream consumption (storing the stream reference and piping
        // it later) deadlocks whenever any field follows a file in the body,
        // causing a 504 timeout.
        const textFields: Record<string, string> = {};
        const savedFiles: SavedFileRef[] = [];
        const savedKeys: string[] = [];

        try {
          for await (const part of request.parts()) {
            if (part.type === 'field') {
              if (typeof part.value === 'string') {
                textFields[part.fieldname] = part.value;
              }
            } else {
              // Save the file stream to storage NOW, before the iterator advances.
              const { storageKey, size } = await app.storage.save({
                stream: part.file,
                filename: part.filename,
                mimeType: part.mimetype,
              });
              savedKeys.push(storageKey);
              savedFiles.push({
                fieldName: part.fieldname,
                filename: part.filename,
                mimeType: part.mimetype,
                storageKey,
                size,
              });
            }
          }
        } catch (err) {
          // Iteration failed mid-stream: delete whatever was already saved.
          await Promise.allSettled(savedKeys.map((k) => app.storage.delete(k)));
          throw err;
        }

        const { id } = await submissionsService.createForSlugMultipart(
          slug,
          textFields,
          savedFiles,
          metaOpts,
        );
        return reply.status(201).send({ id, message: 'Submission received' });
      }

      // ── JSON path (existing behaviour) ─────────────────────────────────
      const { id } = await submissionsService.createForSlug(slug, request.body, metaOpts);
      return reply.status(201).send({ id, message: 'Submission received' });
    },
  );
}
