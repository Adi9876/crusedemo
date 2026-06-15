import type { FastifyPluginAsync } from 'fastify';
import { AppError } from '../../lib/errors.js';
import { MarketService } from './market.service.js';

const marketService = new MarketService();

export const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (_request, reply) => {
    try {
      const data = await marketService.getAllTickers();
      return reply.send({ success: true, data });
    } catch (err) {
      // Return empty list rather than 500 so the frontend doesn't break
      app.log.error(err, 'getAllTickers failed');
      return reply.send({ success: true, data: [] });
    }
  });

  app.get('/:symbol/orderbook', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    try {
      const data = await marketService.getOrderBook(symbol);
      return reply.send({ success: true, data });
    } catch {
      throw new AppError(404, 'NOT_FOUND', `Market not found: ${symbol}`);
    }
  });

  app.get('/:symbol/trades', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    try {
      const data = await marketService.getRecentTrades(symbol);
      return reply.send({ success: true, data });
    } catch {
      throw new AppError(404, 'NOT_FOUND', `Market not found: ${symbol}`);
    }
  });

  app.get('/:symbol/klines', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const { interval = '1D' } = request.query as { interval?: string };
    try {
      const data = await marketService.getKlines(symbol, interval);
      return reply.send({ success: true, data });
    } catch {
      throw new AppError(404, 'NOT_FOUND', `Market not found: ${symbol}`);
    }
  });

  app.get('/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const ticker = await marketService.getTicker(symbol);
    if (!ticker) {
      throw new AppError(404, 'NOT_FOUND', `Market not found: ${symbol}`);
    }
    return reply.send({ success: true, data: ticker });
  });
};
