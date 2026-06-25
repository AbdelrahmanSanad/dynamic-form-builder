import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  createFormBodySchema,
  formIdParamsSchema,
  formListSchema,
  formSchema,
  updateFormBodySchema,
} from './forms.schemas.js';
import { FormsService } from './forms.service.js';

/**
 * Owner-scoped form management. Every route requires authentication; the
 * service enforces that the form belongs to the requesting user.
 */
export async function formRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>();
  const service = new FormsService(app.prisma);

  // All routes in this module require a valid session.
  router.addHook('onRequest', app.authenticate);

  const security = [{ cookieAuth: [] }];

  router.get(
    '/',
    {
      schema: {
        tags: ['forms'],
        summary: 'List the current user\'s forms',
        security,
        response: { 200: formListSchema },
      },
    },
    async (request, reply) => {
      const forms = await service.list(request.user.sub);
      return reply.send({ forms });
    },
  );

  router.post(
    '/',
    {
      schema: {
        tags: ['forms'],
        summary: 'Create a new form',
        security,
        body: createFormBodySchema,
        response: { 201: formSchema },
      },
    },
    async (request, reply) => {
      const form = await service.create(request.user.sub, request.body);
      return reply.status(201).send(form);
    },
  );

  router.get(
    '/:id',
    {
      schema: {
        tags: ['forms'],
        summary: 'Get a single form',
        security,
        params: formIdParamsSchema,
        response: { 200: formSchema },
      },
    },
    async (request, reply) => {
      const form = await service.getOwned(request.user.sub, request.params.id);
      return reply.send(form);
    },
  );

  router.patch(
    '/:id',
    {
      schema: {
        tags: ['forms'],
        summary: 'Update a form\'s title, description, or fields',
        security,
        params: formIdParamsSchema,
        body: updateFormBodySchema,
        response: { 200: formSchema },
      },
    },
    async (request, reply) => {
      const form = await service.update(request.user.sub, request.params.id, request.body);
      return reply.send(form);
    },
  );

  router.delete(
    '/:id',
    {
      schema: {
        tags: ['forms'],
        summary: 'Delete a form and its submissions',
        security,
        params: formIdParamsSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await service.remove(request.user.sub, request.params.id);
      return reply.status(204).send(null);
    },
  );

  router.post(
    '/:id/publish',
    {
      schema: {
        tags: ['forms'],
        summary: 'Publish a form so it can accept public submissions',
        security,
        params: formIdParamsSchema,
        response: { 200: formSchema },
      },
    },
    async (request, reply) => {
      const form = await service.publish(request.user.sub, request.params.id);
      return reply.send(form);
    },
  );

  router.post(
    '/:id/unpublish',
    {
      schema: {
        tags: ['forms'],
        summary: 'Revert a form to draft',
        security,
        params: formIdParamsSchema,
        response: { 200: formSchema },
      },
    },
    async (request, reply) => {
      const form = await service.unpublish(request.user.sub, request.params.id);
      return reply.send(form);
    },
  );
}
