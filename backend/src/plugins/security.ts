import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

/**
 * Baseline HTTP hardening: security headers, CORS allow-list, global rate
 * limiting, and the sensible utility set (httpErrors, assert, etc.).
 */
async function securityPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifySensible);

  await app.register(fastifyHelmet, {
    // The API is consumed by a separate SPA origin; CSP is enforced there.
    contentSecurityPolicy: false,
  });

  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN,
    credentials: true, // required so the browser sends the auth cookie
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
}

export default fp(securityPlugin, { name: 'security' });
