import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  authResponseSchema,
  loginBodySchema,
  registerBodySchema,
} from './auth.schemas.js';
import { AuthService } from './auth.service.js';

const messageSchema = z.object({ message: z.string() });

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>();
  const service = new AuthService(app.prisma);

  router.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a new account and start a session',
        body: registerBodySchema,
        response: { 201: authResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await service.register(request.body);
      app.issueAuthCookie(reply, { sub: user.id, email: user.email });
      return reply.status(201).send({ user });
    },
  );

  router.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate and start a session',
        body: loginBodySchema,
        response: { 200: authResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await service.login(request.body);
      app.issueAuthCookie(reply, { sub: user.id, email: user.email });
      return reply.send({ user });
    },
  );

  router.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'End the current session',
        response: { 200: messageSchema },
      },
    },
    async (_request, reply) => {
      app.clearAuthCookie(reply);
      return reply.send({ message: 'Logged out' });
    },
  );

  router.get(
    '/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get the currently authenticated user',
        security: [{ cookieAuth: [] }],
        response: { 200: authResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await service.getById(request.user.sub);
      return reply.send({ user });
    },
  );
}
