import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AuthService } from './auth.service.js';
import {
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resendVerificationBodySchema
} from './auth.schemas.js';
import { extractBearerToken, verifyAccessToken } from '../../lib/tokens.js';

const authService = new AuthService();

function getHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getRequestContext(request: FastifyRequest) {
  return {
    ipAddress: request.ip,
    userAgent: getHeaderValue(request.headers['user-agent']),
    deviceName: getHeaderValue(request.headers['x-device-name'])
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour'
      }
    }
  }, async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const baseUrl = `${request.protocol}://${request.hostname}`;
    const data = await authService.register(body, getRequestContext(request), baseUrl);

    return reply.code(201).send({
      success: true,
      data
    });
  });

  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const data = await authService.login(body, getRequestContext(request));

    return reply.code(200).send({
      success: true,
      data
    });
  });

  app.post('/refresh', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);
    const data = await authService.refresh(body);

    return reply.code(200).send({
      success: true,
      data
    });
  });

  app.post('/logout', async (request, reply) => {
    const body = logoutBodySchema.parse(request.body ?? {});
    const data = await authService.logout(body, request.headers.authorization);

    return reply.code(200).send({
      success: true,
      data
    });
  });

  app.get('/me', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const payload = verifyAccessToken(token);
    const data = await authService.getMe(payload.sub);

    return reply.code(200).send({
      success: true,
      data
    });
  });

  app.get('/verify-email', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.query);
    try {
      await authService.verifyEmail(token);
      const targetUrl = `${env.CORS_ORIGINS.split(',')[0]}/login?verified=true`;
      return reply.redirect(targetUrl);
    } catch (error: any) {
      const message = error.message || 'Verification failed';
      const targetUrl = `${env.CORS_ORIGINS.split(',')[0]}/login?verified=false&error=${encodeURIComponent(message)}`;
      return reply.redirect(targetUrl);
    }
  });

  app.post('/resend-verification', {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '15 minutes'
      }
    }
  }, async (request, reply) => {
    const { email } = resendVerificationBodySchema.parse(request.body);
    const baseUrl = `${request.protocol}://${request.hostname}`;
    const data = await authService.resendVerification(email, baseUrl);

    return reply.code(200).send({
      success: true,
      data
    });
  });
};
