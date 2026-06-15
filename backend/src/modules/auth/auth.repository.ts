import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

const userWithProfileInclude = {
  profile: true
} as const satisfies Prisma.UserInclude;

const sessionWithUserInclude = {
  user: {
    include: userWithProfileInclude
  }
} as const satisfies Prisma.AuthSessionInclude;

export type UserWithProfile = Prisma.UserGetPayload<{
  include: typeof userWithProfileInclude;
}>;

export type SessionWithUser = Prisma.AuthSessionGetPayload<{
  include: typeof sessionWithUserInclude;
}>;

interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  dateOfBirth?: Date;
  addressLine1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  termsAcceptedAt: Date;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
}

interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

interface UpdateSessionInput {
  refreshTokenHash?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  isRevoked?: boolean;
  revokedAt?: Date;
}

export class AuthRepository {
  findUserByEmail(email: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { email },
      include: userWithProfileInclude
    });
  }

  findUserById(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id },
      include: userWithProfileInclude
    });
  }

  createUser(input: CreateUserInput): Promise<UserWithProfile> {
    return prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: input.passwordHash,
        phone: input.phone,
        dateOfBirth: input.dateOfBirth,
        termsAcceptedAt: input.termsAcceptedAt,
        emailVerificationToken: input.emailVerificationToken,
        emailVerificationExpiry: input.emailVerificationExpiry,
        profile: {
          create: {
            addressLine1: input.addressLine1,
            city: input.city,
            postalCode: input.postalCode,
            country: input.country
          }
        }
      },
      include: userWithProfileInclude
    });
  }

  createSession(input: CreateSessionInput) {
    return prisma.authSession.create({
      data: input
    });
  }

  findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<SessionWithUser | null> {
    return prisma.authSession.findUnique({
      where: { refreshTokenHash },
      include: sessionWithUserInclude
    });
  }

  updateSession(sessionId: string, input: UpdateSessionInput) {
    return prisma.authSession.update({
      where: { id: sessionId },
      data: input
    });
  }

  revokeSession(sessionId: string) {
    return prisma.authSession.updateMany({
      where: {
        id: sessionId,
        isRevoked: false
      },
      data: {
        isRevoked: true,
        revokedAt: new Date()
      }
    });
  }

  revokeAllSessionsForUser(userId: string) {
    return prisma.authSession.updateMany({
      where: {
        userId,
        isRevoked: false
      },
      data: {
        isRevoked: true,
        revokedAt: new Date()
      }
    });
  }
}
