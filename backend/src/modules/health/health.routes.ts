import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  timestamp: z.string(),
});

/** Liveness/readiness probe; also verifies database connectivity. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const router = app.withTypeProvider<ZodTypeProvider>();

  router.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Service health check',
        response: { 200: healthSchema },
      },
    },
    async (_request, reply) => {
      await app.prisma.$queryRaw`SELECT 1`;
      return reply.send({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    },
  );
}
