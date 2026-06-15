import type { FastifyPluginAsync } from 'fastify';
import { WalletService } from './wallet.service.js';
import { depositSchema, withdrawalSchema } from './wallet.schemas.js';
import { extractBearerToken, verifyAccessToken } from '../../lib/tokens.js';

const walletService = new WalletService();

export const walletRoutes: FastifyPluginAsync = async (app) => {
  // Auth middleware for all wallet routes
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

  // GET /balances — all wallet balances
  app.get('/balances', async (request) => {
    const data = await walletService.getBalances(request.user.id);
    return { success: true, data };
  });

  // GET /balances/:currency — single balance
  app.get('/balances/:currency', async (request) => {
    const { currency } = request.params as { currency: string };
    const data = await walletService.getBalance(request.user.id, currency);
    return { success: true, data };
  });

  // POST /deposit — simulate a deposit
  app.post('/deposit', async (request) => {
    const body = depositSchema.parse(request.body);
    const data = await walletService.createDeposit(request.user.id, body);
    return { success: true, data };
  });

  // GET /deposit-address — get real deposit address from Bybit
  app.get('/deposit-address', async (request, reply) => {
    const { coin } = request.query as { coin?: string };
    if (!coin) {
      return reply.code(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Coin query parameter is required' },
      });
    }
    const data = await walletService.getDepositAddress(request.user.id, coin);
    return { success: true, data };
  });

  // GET /deposits — deposit history
  app.get('/deposits', async (request) => {
    const data = await walletService.getDepositHistory(request.user.id);
    return { success: true, data };
  });

  // POST /withdraw — request a withdrawal
  app.post('/withdraw', async (request) => {
    const body = withdrawalSchema.parse(request.body);
    const data = await walletService.requestWithdrawal(request.user.id, body);
    return { success: true, data };
  });

  // GET /withdrawals — withdrawal history
  app.get('/withdrawals', async (request) => {
    const data = await walletService.getWithdrawalHistory(request.user.id);
    return { success: true, data };
  });

  // GET /fee/:currency — get network fee for a currency
  app.get('/fee/:currency', async (request) => {
    const { currency } = request.params as { currency: string };
    const fee = walletService.getNetworkFee(currency);
    return { success: true, data: { currency: currency.toUpperCase(), fee } };
  });
};
