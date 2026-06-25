import { fastify, type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env, isProduction } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { formRoutes } from './modules/forms/forms.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { LocalDiskStorageService } from './modules/storage/storage.service.js';
import type { StorageService } from './modules/storage/storage.types.js';
import { submissionRoutes } from './modules/submissions/submissions.routes.js';
import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import multipartPlugin from './plugins/multipart.js';
import prismaPlugin from './plugins/prisma.js';
import securityPlugin from './plugins/security.js';
import spaPlugin from './plugins/spa.js';
import swaggerPlugin from './plugins/swagger.js';

declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageService;
  }
}

/**
 * Composes the Fastify application: logging, the Zod type provider, shared
 * plugins, and the feature modules. Kept free of any `listen` call so it can be
 * imported directly by tests.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    logger: buildLoggerOptions(),
    // Trust the reverse proxy so `request.ip` reflects the real client.
    trustProxy: true,
    // Must be at least as large as UPLOAD_MAX_FILE_SIZE_BYTES (default 5 MiB).
    // The 1 MiB default would reject multipart requests before @fastify/multipart
    // can parse them, causing the client to see a 413 or gateway timeout.
    bodyLimit: 20 * 1_048_576, // 20 MiB
  }).withTypeProvider<ZodTypeProvider>();

  // Route schemas are Zod; wire up validation + serialization.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Cross-cutting concerns first.
  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin);
  await app.register(swaggerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(multipartPlugin);

  // Storage — ensure the upload directory exists before handling any requests.
  const diskStorage = new LocalDiskStorageService(env.UPLOAD_DIR);
  await diskStorage.ensureDir();
  app.decorate('storage', diskStorage as StorageService);

  // Feature modules.
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(formRoutes, { prefix: '/api/forms' });
  await app.register(submissionRoutes, { prefix: '/api' });
  await app.register(publicRoutes, { prefix: '/api/public' });

  // SPA + not-found handler last, so API routes always take precedence.
  await app.register(spaPlugin);

  await app.ready();
  return app;
}

function buildLoggerOptions() {
  if (isProduction) {
    return { level: env.LOG_LEVEL };
  }
  return {
    level: env.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  };
}
