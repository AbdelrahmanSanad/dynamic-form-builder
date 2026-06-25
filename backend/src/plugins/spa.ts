import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

/**
 * Serves the built React SPA from the same origin as the API so the
 * `SameSite=Lax` auth cookie continues to work (no CORS, no cross-site cookies).
 *
 * Real asset files (e.g. /assets/index-*.js) are served by @fastify/static.
 * Any other GET request that isn't an API/health/docs route falls back to
 * index.html so client-side routing works on deep links and refreshes.
 *
 * When the static directory is absent (dev server, tests) only the JSON 404
 * not-found handler is installed — the SPA is served separately in dev by Vite.
 */
async function spaPlugin(app: FastifyInstance): Promise<void> {
  const staticDir = resolve(process.cwd(), env.STATIC_DIR);
  const hasStatic = existsSync(join(staticDir, 'index.html'));

  if (hasStatic) {
    await app.register(fastifyStatic, {
      root: staticDir,
      wildcard: false,
    });
  }

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const isApiRoute =
      request.url.startsWith('/api') ||
      request.url.startsWith('/health') ||
      request.url.startsWith('/docs');

    if (hasStatic && request.method === 'GET' && !isApiRoute) {
      return reply.sendFile('index.html');
    }

    return reply.status(404).send({
      error: {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}

export default fp(spaPlugin, { name: 'spa', dependencies: ['error-handler'] });
