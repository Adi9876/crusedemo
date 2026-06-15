import { randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  createRefreshToken,
  extractBearerToken,
  getRefreshSessionExpiry,
  hashToken,
  signAccessToken,
  verifyAccessToken
} from '../../lib/tokens.js';
import { AuthRepository, type SessionWithUser, type UserWithProfile } from './auth.repository.js';
import type { LoginBody, LogoutBody, RefreshBody, RegisterBody } from './auth.schemas.js';
import { sendEmail } from '../../lib/mailer.js';
import { getVerificationEmailTemplate } from '../../lib/email-templates.js';
import { prisma } from '../../lib/prisma.js';

interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

function ensureUserCanAuthenticate(user: UserWithProfile) {
  if (user.status === 'SUSPENDED') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  }
  if (env.EMAIL_VERIFICATION_REQUIRED === 'true' && user.status === 'PENDING_VERIFICATION') {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Your email address is not verified yet');
  }
}

function mapUser(user: UserWithProfile) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    role: user.role,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile
      ? {
          addressLine1: user.profile.addressLine1,
          city: user.profile.city,
          postalCode: user.profile.postalCode,
          country: user.profile.country,
          kycStatus: user.profile.kycStatus
        }
      : null
  };
}

function mapSession(session: {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  isRevoked: boolean;
}) {
  return {
    id: session.id,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    expiresAt: session.expiresAt,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
    isRevoked: session.isRevoked
  };
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register(body: RegisterBody, context: RequestContext, baseUrl: string) {
    const existingUser = await this.repository.findUserByEmail(body.email);

    if (existingUser) {
      throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
    }

    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await this.repository.createUser({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      phone: body.phone,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      addressLine1: body.addressLine1,
      city: body.city,
      postalCode: body.postalCode,
      country: body.country,
      termsAcceptedAt: new Date(),
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry
    });

    const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
    void sendEmail({
      to: user.email,
      subject: 'Verify your CruseX email address',
      html: getVerificationEmailTemplate(verifyUrl, user.firstName)
    });

    return this.issueAuthSession(user, {
      ...context,
      deviceName: body.deviceName ?? context.deviceName
    });
  }

  async login(body: LoginBody, context: RequestContext) {
    const user = await this.repository.findUserByEmail(body.email);

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    ensureUserCanAuthenticate(user);

    const isValidPassword = await verifyPassword(body.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }

    return this.issueAuthSession(user, {
      ...context,
      deviceName: body.deviceName ?? context.deviceName
    });
  }

  async refresh(body: RefreshBody) {
    const session = await this.getActiveSession(body.refreshToken);
    ensureUserCanAuthenticate(session.user);

    const nextRefreshToken = createRefreshToken();
    const nextRefreshTokenHash = hashToken(nextRefreshToken);
    const nextExpiry = getRefreshSessionExpiry();
    const lastUsedAt = new Date();

    await this.repository.updateSession(session.id, {
      refreshTokenHash: nextRefreshTokenHash,
      lastUsedAt,
      expiresAt: nextExpiry
    });

    return {
      user: mapUser(session.user),
      session: mapSession({
        id: session.id,
        deviceName: session.deviceName,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: nextExpiry,
        lastUsedAt,
        createdAt: session.createdAt,
        isRevoked: session.isRevoked
      }),
      tokens: {
        accessToken: signAccessToken({
          sub: session.user.id,
          sessionId: session.id,
          email: session.user.email,
          role: session.user.role,
          type: 'access'
        }),
        refreshToken: nextRefreshToken,
        tokenType: 'Bearer',
        expiresIn: env.ACCESS_TOKEN_TTL
      }
    };
  }

  async logout(body: LogoutBody, authorizationHeader?: string) {
    if (body.logoutAll) {
      const accessToken = extractBearerToken(authorizationHeader);

      if (!accessToken) {
        throw new AppError(
          400,
          'AUTHORIZATION_REQUIRED',
          'Authorization header is required to logout all sessions'
        );
      }

      const payload = verifyAccessToken(accessToken);
      const result = await this.repository.revokeAllSessionsForUser(payload.sub);

      return {
        revokedSessions: result.count
      };
    }

    if (body.refreshToken) {
      const session = await this.repository.findSessionByRefreshTokenHash(hashToken(body.refreshToken));

      if (!session) {
        return {
          revokedSessions: 0
        };
      }

      const result = await this.repository.revokeSession(session.id);

      return {
        revokedSessions: result.count
      };
    }

    const accessToken = extractBearerToken(authorizationHeader);

    if (!accessToken) {
      throw new AppError(
        400,
        'LOGOUT_TARGET_REQUIRED',
        'Provide a refresh token or a Bearer token to logout'
      );
    }

    const payload = verifyAccessToken(accessToken);
    const result = await this.repository.revokeSession(payload.sessionId);

    return {
      revokedSessions: result.count
    };
  }

  async getMe(userId: string) {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    ensureUserCanAuthenticate(user);

    return {
      user: mapUser(user)
    };
  }

  private async issueAuthSession(user: UserWithProfile, context: RequestContext) {
    ensureUserCanAuthenticate(user);

    const refreshToken = createRefreshToken();
    const session = await this.repository.createSession({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      deviceName: context.deviceName ?? inferDeviceName(context.userAgent),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: getRefreshSessionExpiry()
    });

    return {
      user: mapUser(user),
      session: mapSession(session),
      tokens: {
        accessToken: signAccessToken({
          sub: user.id,
          sessionId: session.id,
          email: user.email,
          role: user.role,
          type: 'access'
        }),
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: env.ACCESS_TOKEN_TTL
      }
    };
  }

  private async getActiveSession(refreshToken: string): Promise<SessionWithUser> {
    const session = await this.repository.findSessionByRefreshTokenHash(hashToken(refreshToken));

    if (!session) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }

    if (session.isRevoked) {
      throw new AppError(401, 'SESSION_REVOKED', 'This session has already been logged out');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.repository.updateSession(session.id, {
        isRevoked: true,
        revokedAt: new Date()
      });

      throw new AppError(401, 'SESSION_EXPIRED', 'Refresh session has expired');
    }

    return session;
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new AppError(400, 'INVALID_TOKEN', 'Token is required');
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      }
    });

    if (!user) {
      throw new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid or expired');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      }
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string, baseUrl: string) {
    if (!email) {
      throw new AppError(400, 'EMAIL_REQUIRED', 'Email is required');
    }

    const user = await this.repository.findUserByEmail(email);

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (user.status === 'ACTIVE' || user.emailVerifiedAt) {
      throw new AppError(400, 'ALREADY_VERIFIED', 'Email is already verified');
    }

    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      }
    });

    const verifyUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;
    void sendEmail({
      to: user.email,
      subject: 'Verify your CruseX email address',
      html: getVerificationEmailTemplate(verifyUrl, user.firstName)
    });

    return { message: 'Verification email sent successfully' };
  }
}

function inferDeviceName(userAgent?: string): string | undefined {
  if (!userAgent) {
    return undefined;
  }

  return userAgent.slice(0, 100);
}
