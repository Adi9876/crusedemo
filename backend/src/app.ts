import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { corsOrigins } from './config/env.js';
import { AppError } from './lib/errors.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { marketRoutes } from './modules/market/market.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { walletRoutes } from './modules/wallet/wallet.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { tradingRoutes } from './modules/trading/trading.routes.js';

export function buildApp() {
  const app = Fastify({
    logger: true
  });

  void app.register(helmet, {
    contentSecurityPolicy: false
  });

  void app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  void app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
    skipOnError: true,
    keyGenerator: (request) => {
      // Use user ID from JWT if available, otherwise fall back to IP
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          // Decode without verifying — just for rate limit key
          const token = authHeader.substring(7);
          const parts = token.split('.');
          if (parts.length === 3) {
            const jwtPart = parts[1];
            if (jwtPart) {
              const payload = JSON.parse(Buffer.from(jwtPart, 'base64url').toString());
              if (payload.sub) return `user:${payload.sub}`;
            }
          }
        } catch {}
      }
      return request.ip;
    }
  });

  app.setErrorHandler((error: any, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten()
        }
      });
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
    }

    app.log.error(error);

    // const message = error instanceof Error ? error.message : 'Internal Server Error';
    // const stack = error instanceof Error ? error.stack : undefined;

    return reply.code(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        // message,
        // stack
        message: 'Internal Server Error'
      }
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  });

  void app.register(healthRoutes);
  void app.register(authRoutes, { prefix: '/auth' });
  void app.register(marketRoutes, { prefix: '/api/v1/markets' });
  void app.register(userRoutes, { prefix: '/api/v1/user' });
  void app.register(walletRoutes, { prefix: '/api/v1/wallet' });
  void app.register(adminRoutes, { prefix: '/api/v1/admin' });
  void app.register(tradingRoutes, { prefix: '/api/v1/trading' });

  return app;
}
// Trigger dev server hot-restart
