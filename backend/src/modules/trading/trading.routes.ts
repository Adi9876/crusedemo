import type { FastifyPluginAsync } from 'fastify';
import jwt from 'jsonwebtoken';
import { TradingService } from './trading.service.js';
import { createOrderSchema } from './trading.schemas.js';
import { extractBearerToken, verifyAccessToken } from '../../lib/tokens.js';

const tradingService = new TradingService();

export const tradingRoutes: FastifyPluginAsync = async (app) => {
  // Auth middleware for all trading routes
  app.addHook('preHandler', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub };
    } catch {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }
  });

  // POST /orders — place an order
  app.post('/orders', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (request) => {
          const authHeader = request.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
              const token = authHeader.substring(7);
              const decoded = jwt.decode(token) as { sub?: string } | null;
              if (decoded?.sub) return decoded.sub;
            } catch {}
          }
          return request.ip;
        }
      }
    }
  }, async (request) => {
    const body = createOrderSchema.parse(request.body);
    const data = await tradingService.createOrder(request.user.id, body);
    return { success: true, data };
  });

  // DELETE /orders/:id — cancel an order
  app.delete('/orders/:id', async (request) => {
    const { id } = request.params as { id: string };
    const data = await tradingService.cancelOrder(request.user.id, id);
    return { success: true, data };
  });

  // GET /orders/open — get current open orders
  app.get('/orders/open', async (request) => {
    const data = await tradingService.getOpenOrders(request.user.id);
    return { success: true, data };
  });

  // GET /orders/history — get historical orders
  app.get('/orders/history', async (request) => {
    const data = await tradingService.getOrderHistory(request.user.id);
    return { success: true, data };
  });

  // GET /trades — get trade history executions
  app.get('/trades', async (request) => {
    const data = await tradingService.getUserTrades(request.user.id);
    return { success: true, data };
  });
};
