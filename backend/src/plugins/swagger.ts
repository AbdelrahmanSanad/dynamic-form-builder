import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { isProduction } from '../config/env.js';

/**
 * Generates an OpenAPI document from the Zod route schemas and serves an
 * interactive explorer at `/docs`. Disabled in production by default.
 */
async function swaggerPlugin(app: FastifyInstance): Promise<void> {
  if (isProduction) return;

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Dynamic Form Builder API',
        description: 'Create dynamic forms, publish them, and collect submissions.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'access_token',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
}

export default fp(swaggerPlugin, { name: 'swagger' });
