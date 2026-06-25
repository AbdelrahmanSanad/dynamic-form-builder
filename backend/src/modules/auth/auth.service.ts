import type { PrismaClient, User } from '@prisma/client';
import argon2 from 'argon2';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { LoginBody, PublicUser, RegisterBody } from './auth.schemas.js';

/**
 * Authentication use-cases. Pure business logic: it knows nothing about HTTP,
 * cookies, or JWTs — those concerns live in the route layer.
 */
export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async register(input: RegisterBody): Promise<PublicUser> {
    const email = input.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: { email, name: input.name, passwordHash },
    });

    return toPublicUser(user);
  }

  async login(input: LoginBody): Promise<PublicUser> {
    const email = input.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always run a verification to keep timing roughly constant whether or not
    // the email exists, reducing user-enumeration signal.
    const hash = user?.passwordHash ?? (await getDummyHash());
    const valid = await argon2.verify(hash, input.password).catch(() => false);

    if (!user || !valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return toPublicUser(user);
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UnauthorizedError();
    }
    return toPublicUser(user);
  }
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

// A real argon2id hash computed once and reused to equalise timing on the
// "user not found" path. The plaintext is irrelevant; it never matches input.
let dummyHashPromise: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('dummy-password-for-timing-equalisation', {
    type: argon2.argon2id,
  });
  return dummyHashPromise;
}
