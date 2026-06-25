import fastifyMultipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

/**
 * Registers @fastify/multipart with limits derived from the environment config.
 * This plugin must be registered before any route that handles multipart bodies.
 */
async function multipartPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_FILE_SIZE_BYTES,
      files: env.UPLOAD_MAX_FILES_PER_REQUEST,
    },
  });
}

export default fp(multipartPlugin, { name: 'multipart' });
