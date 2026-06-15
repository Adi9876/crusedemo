import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { WalletService } from '../wallet/wallet.service.js';
import { extractBearerToken, verifyAccessToken } from '../../lib/tokens.js';
import { PrismaClient } from '@prisma/client';
import { isAutoApprovalEnabled, setAutoApprovalEnabled } from './admin.settings.js';
import { AdminKycService } from './admin.kyc.service.js';

const prisma = new PrismaClient();
const walletService = new WalletService();
const adminKycService = new AdminKycService();


export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Auth + Admin check middleware
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

      // Check if user is ADMIN
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true },
      });

      if (!user || user.role !== 'ADMIN') {
        return reply.code(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
      }
    } catch {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
    }
  });

  // GET /withdrawals — all withdrawals (pending first)
  app.get('/withdrawals', async () => {
    const data = await walletService.getAllWithdrawals();
    return { success: true, data };
  });

  // GET /withdrawals/pending — pending only
  app.get('/withdrawals/pending', async () => {
    const data = await walletService.getAllPendingWithdrawals();
    return { success: true, data };
  });

  // POST /withdrawals/:id/approve
  app.post('/withdrawals/:id/approve', async (request) => {
    const { id } = request.params as { id: string };
    const data = await walletService.approveWithdrawal(id, request.user.id);
    return { success: true, data };
  });

  // POST /withdrawals/:id/reject
  app.post('/withdrawals/:id/reject', async (request) => {
    const { id } = request.params as { id: string };
    const data = await walletService.rejectWithdrawal(id, request.user.id);
    return { success: true, data };
  });

  // GET /settings/auto-approval — check status
  app.get('/settings/auto-approval', async () => {
    return { success: true, data: { enabled: await isAutoApprovalEnabled() } };
  });

  // POST /settings/auto-approval — toggle
  app.post('/settings/auto-approval', async (request) => {
    const { enabled } = request.body as { enabled: boolean };
    await setAutoApprovalEnabled(!!enabled);
    return { success: true, data: { enabled: await isAutoApprovalEnabled() } };
  });

  // GET /stats — quick admin dashboard stats
  app.get('/stats', async () => {
    const [pendingCount, totalUsers, totalDeposits, totalWithdrawals, autoApproval] = await Promise.all([
      prisma.withdrawal.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.user.count(),
      prisma.deposit.count(),
      prisma.withdrawal.count(),
      isAutoApprovalEnabled(),
    ]);

    return {
      success: true,
      data: {
        pendingWithdrawals: pendingCount,
        totalUsers,
        totalDeposits,
        totalWithdrawals,
        autoApprovalEnabled: autoApproval,
      },
    };
  });

  // GET /kyc — get all pending KYC users
  app.get('/kyc', async () => {
    const data = await adminKycService.getPendingKycUsers();
    return { success: true, data };
  });

  // POST /kyc/:userId/approve — approve user's KYC
  app.post('/kyc/:userId/approve', async (request) => {
    const { userId } = request.params as { userId: string };
    const data = await adminKycService.approveUserKyc(userId);
    return { success: true, data };
  });

  // POST /kyc/:userId/reject — reject user's KYC
  app.post('/kyc/:userId/reject', async (request) => {
    const { userId } = request.params as { userId: string };
    const { reason } = z.object({
      reason: z.string().trim().min(1, 'Rejection reason is required')
    }).parse(request.body);
    const data = await adminKycService.rejectUserKyc(userId, reason);
    return { success: true, data };
  });
};

