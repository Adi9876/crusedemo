import { createHash, randomBytes } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  sessionId: string;
  email: string;
  role: string;
  type: 'access';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn']
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (typeof decoded === 'string' || decoded.type !== 'access') {
      throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired');
    }

    return decoded as AccessTokenPayload;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired');
  }
}

export function createRefreshToken(): string {
  return randomBytes(env.REFRESH_TOKEN_BYTES).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getRefreshSessionExpiry(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_SESSION_TTL_DAYS);
  return expiresAt;
}

export function extractBearerToken(headerValue?: string): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}
