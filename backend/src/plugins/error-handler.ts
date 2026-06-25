import { Prisma } from '@prisma/client';
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { isProduction } from '../config/env.js';
import { AppError } from '../lib/errors.js';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

function send(reply: FastifyReply, body: ErrorBody): void {
  void reply.status(body.statusCode).send({ error: body });
}

/**
 * Single source of truth for turning thrown errors into HTTP responses.
 *
 * Maps domain errors, request-validation failures, and known Prisma errors to
 * stable, structured JSON. Unexpected errors are logged and returned as a
 * generic 500 so internal details never leak to clients.
 */
async function errorHandlerPlugin(app: FastifyInstance): Promise<void> {
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    send(reply, {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // 1. Request schema validation (params/query/body) via Zod.
    if (hasZodFastifySchemaValidationErrors(error)) {
      return send(reply, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      });
    }

    // 2. Response serialization mismatch — a server bug, log loudly.
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error }, 'Response serialization error');
      return send(reply, {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
    }

    // 3. Domain errors thrown by services.
    if (error instanceof AppError) {
      return send(reply, {
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      });
    }

    // 4. Standalone Zod errors (e.g. dynamic submission validation).
    if (error instanceof ZodError) {
      return send(reply, {
        statusCode: 422,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.flatten(),
      });
    }

    // 5. Known Prisma errors.
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return send(reply, {
          statusCode: 409,
          code: 'CONFLICT',
          message: 'A record with these unique values already exists',
        });
      }
      if (error.code === 'P2025') {
        return send(reply, {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }
    }

    // 6. Rate limiting and other Fastify errors carry their own statusCode.
    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      return send(reply, {
        statusCode: error.statusCode,
        code: error.code ?? 'ERROR',
        message: error.message,
      });
    }

    // 7. Anything else is unexpected.
    request.log.error({ err: error }, 'Unhandled error');
    return send(reply, {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'Internal server error' : error.message,
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
