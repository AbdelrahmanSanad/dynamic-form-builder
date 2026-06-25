import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env, AUTH_COOKIE, isProduction } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

/** Shape of the data we sign into the JWT. */
export interface AuthTokenPayload {
  sub: string;
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Pre-handler guard that rejects unauthenticated requests. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Issues a JWT for the given user and sets it as an httpOnly cookie. */
    issueAuthCookie: (reply: FastifyReply, payload: AuthTokenPayload) => void;
    /** Clears the auth cookie (logout). */
    clearAuthCookie: (reply: FastifyReply) => void;
  }
}

/**
 * Wires up cookie + JWT support and exposes auth helpers.
 *
 * The token is delivered exclusively via an httpOnly, SameSite=Lax cookie so it
 * is never readable by client-side JavaScript (mitigating XSS token theft).
 */
async function authPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: AUTH_COOKIE,
      signed: false,
    },
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  app.decorate('authenticate', async function (request: FastifyRequest): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
  });

  app.decorate('issueAuthCookie', function (reply: FastifyReply, payload: AuthTokenPayload): void {
    const token = app.jwt.sign(payload);
    reply.setCookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE || isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days, in seconds
    });
  });

  app.decorate('clearAuthCookie', function (reply: FastifyReply): void {
    reply.clearCookie(AUTH_COOKIE, { path: '/' });
  });
}

export default fp(authPlugin, { name: 'auth', dependencies: [] });
