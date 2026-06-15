import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import type { DepositInput, WithdrawalInput } from './wallet.schemas.js';
import { isAutoApprovalEnabled } from '../admin/admin.settings.js';
import { ExchangeService } from '../trading/exchange.service.js';

// Network fees per currency (simplified flat fees)
const NETWORK_FEES: Record<string, string> = {
  BTC: '0.0001',
  ETH: '0.001',
  USDT: '1',
  SOL: '0.01',
  BNB: '0.001',
  USDC: '1',
  XRP: '0.25',
  ADA: '1',
  DOGE: '2',
  MATIC: '0.1',
  POL: '0.1',
  AVAX: '0.01',
  LINK: '0.3',
};

export class WalletService {
  // ── Balances ──

  async getBalances(userId: string) {
    const supportedCurrencies = ['BTC', 'ETH', 'USDT', 'SOL', 'BNB', 'USDC', 'XRP', 'ADA', 'DOGE', 'POL', 'AVAX', 'LINK'];
    
    // Fetch from local DB
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { currency: 'asc' },
    });

    // Make sure we have at least 0-balance entries for all supported coins in our meta
    const walletMap = new Map(wallets.map((w) => [w.currency, w]));
    
    return supportedCurrencies.map((cur) => {
      const w = walletMap.get(cur);
      return {
        id: w?.id || `temp_${cur}`,
        currency: cur,
        balance: w ? w.balance.toString() : '0',
        locked: w ? w.locked.toString() : '0',
        available: w ? new Prisma.Decimal(w.balance).minus(w.locked).toString() : '0',
        updatedAt: w ? w.updatedAt : new Date(),
      };
    });
  }

  async getBalance(userId: string, currency: string) {
    const curUpper = currency.toUpperCase();
    // Sync all balances first to make sure we have the latest
    await this.getBalances(userId);
    
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: curUpper } },
    });

    if (!wallet) {
      return {
        currency: curUpper,
        balance: '0',
        locked: '0',
        available: '0',
      };
    }

    return {
      currency: wallet.currency,
      balance: wallet.balance.toString(),
      locked: wallet.locked.toString(),
      available: new Prisma.Decimal(wallet.balance).minus(wallet.locked).toString(),
    };
  }

  // ── Deposits ──

  async createDeposit(userId: string, input: DepositInput) {
    const amount = new Prisma.Decimal(input.amount);

    if (amount.lte(0)) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Deposit amount must be greater than 0');
    }

    // Use a transaction to atomically create a pending deposit
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit record (PENDING blockchain confirmation or admin approval)
      const deposit = await tx.deposit.create({
        data: {
          userId,
          currency: input.currency,
          amount,
          network: input.network,
          txHash: input.txHash || '',
          depositAddress: null,
          status: 'PENDING',
        },
      });

      // We do not increment the wallet balance here anymore.
      // Balance will only be updated by a secure webhook/indexer later.
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: input.currency } },
      }) || { balance: new Prisma.Decimal(0) };

      return { wallet, deposit };
    });

    return {
      depositId: result.deposit.id,
      currency: result.deposit.currency,
      amount: result.deposit.amount.toString(),
      status: result.deposit.status,
      newBalance: result.wallet.balance.toString(),
    };
  }

  async getDepositHistory(userId: string) {
    const deposits = await prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return deposits.map((d) => ({
      id: d.id,
      currency: d.currency,
      amount: d.amount.toString(),
      network: d.network,
      txHash: d.txHash || '',
      status: d.status as 'CONFIRMED' | 'FAILED' | 'PENDING',
      createdAt: d.createdAt,
    }));
  }

  async getDepositAddress(userId: string, coin: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, bybitSubMemberId: true },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const exchangeService = new ExchangeService();
    let subMemberId = user.bybitSubMemberId;

    if (!subMemberId) {
      // Generate a compliant username: 6-16 characters, alphanumeric, starts with a letter, contains both letters and numbers
      const rand = Math.random().toString(36).substring(2, 8); // 6 alphanumeric chars
      const username = `fcu${rand}${Date.now().toString().slice(-3)}`;
      
      try {
        subMemberId = await exchangeService.createSubMember(username);
        await prisma.user.update({
          where: { id: userId },
          data: { bybitSubMemberId: subMemberId },
        });
      } catch (err) {
        console.error('[WalletService] Failed to create Bybit sub-account for user:', err);
        throw new AppError(
          502,
          'SUB_ACCOUNT_CREATION_FAILED',
          `Could not create sub-account: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    try {
      return await exchangeService.getDepositAddress(coin, subMemberId);
    } catch (err) {
      console.error(`[WalletService] Failed to query deposit address for sub-account ${subMemberId}:`, err);
      throw new AppError(
        502,
        'DEPOSIT_ADDRESS_FETCH_FAILED',
        `Failed to fetch deposit address: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── Withdrawals ──

  async requestWithdrawal(userId: string, input: WithdrawalInput) {
    const amount = new Prisma.Decimal(input.amount);
    const fee = new Prisma.Decimal(NETWORK_FEES[input.currency] ?? '0');
    const totalDeduction = amount.plus(fee);

    if (amount.lte(0)) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Withdrawal amount must be greater than 0');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get current wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: input.currency } },
      });

      if (!wallet) {
        throw new AppError(400, 'NO_WALLET', `No ${input.currency} wallet found`);
      }

      const available = new Prisma.Decimal(wallet.balance).minus(wallet.locked);
      if (available.lt(totalDeduction)) {
        throw new AppError(400, 'INSUFFICIENT_BALANCE', `Insufficient ${input.currency} balance. Available: ${available.toString()}, Required: ${totalDeduction.toString()}`);
      }

      // Lock the funds
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { locked: { increment: totalDeduction } },
      });

      // Create withdrawal record
      const withdrawal = await tx.withdrawal.create({
        data: {
          userId,
          currency: input.currency,
          amount,
          fee,
          network: input.network,
          toAddress: input.toAddress,
          status: 'PENDING_REVIEW',
        },
      });

      // If auto-approval is enabled, immediately process
      if (await isAutoApprovalEnabled()) {
        const simTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

        // Deduct from balance and unlock
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: totalDeduction },
            locked: { decrement: totalDeduction },
          },
        });

        const approved = await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: 'COMPLETED',
            reviewedAt: new Date(),
            completedAt: new Date(),
            txHash: simTxHash,
          },
        });

        return approved;
      }

      return withdrawal;
    });

    return {
      withdrawalId: result.id,
      currency: result.currency,
      amount: result.amount.toString(),
      fee: result.fee.toString(),
      status: result.status,
      toAddress: result.toAddress,
      network: result.network,
      createdAt: result.createdAt,
    };
  }


  async getWithdrawalHistory(userId: string) {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return withdrawals.map((w) => ({
      id: w.id,
      currency: w.currency,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      network: w.network,
      toAddress: w.toAddress,
      txHash: w.txHash,
      status: w.status,
      createdAt: w.createdAt,
      completedAt: w.completedAt,
    }));
  }

  // ── Admin Operations ──

  async getAllPendingWithdrawals() {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      userEmail: w.user.email,
      userName: `${w.user.firstName} ${w.user.lastName}`,
      currency: w.currency,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      network: w.network,
      toAddress: w.toAddress,
      status: w.status,
      createdAt: w.createdAt,
    }));
  }

  async getAllWithdrawals() {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      userId: w.userId,
      userEmail: w.user.email,
      userName: `${w.user.firstName} ${w.user.lastName}`,
      currency: w.currency,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      network: w.network,
      toAddress: w.toAddress,
      txHash: w.txHash,
      status: w.status,
      reviewedBy: w.reviewedBy,
      reviewedAt: w.reviewedAt,
      completedAt: w.completedAt,
      createdAt: w.createdAt,
    }));
  }

  async approveWithdrawal(withdrawalId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });

      if (!withdrawal) {
        throw new AppError(404, 'NOT_FOUND', 'Withdrawal not found');
      }
      if (withdrawal.status !== 'PENDING_REVIEW') {
        throw new AppError(400, 'INVALID_STATUS', `Cannot approve withdrawal with status: ${withdrawal.status}`);
      }

      const totalDeduction = new Prisma.Decimal(withdrawal.amount).plus(withdrawal.fee);
      const simTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Deduct from balance and unlock
      await tx.wallet.update({
        where: { userId_currency: { userId: withdrawal.userId, currency: withdrawal.currency } },
        data: {
          balance: { decrement: totalDeduction },
          locked: { decrement: totalDeduction },
        },
      });

      // Mark as completed
      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
          completedAt: new Date(),
          txHash: simTxHash,
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        txHash: updated.txHash,
      };
    });
  }

  async rejectWithdrawal(withdrawalId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });

      if (!withdrawal) {
        throw new AppError(404, 'NOT_FOUND', 'Withdrawal not found');
      }
      if (withdrawal.status !== 'PENDING_REVIEW') {
        throw new AppError(400, 'INVALID_STATUS', `Cannot reject withdrawal with status: ${withdrawal.status}`);
      }

      const totalDeduction = new Prisma.Decimal(withdrawal.amount).plus(withdrawal.fee);

      // Unlock the funds
      await tx.wallet.update({
        where: { userId_currency: { userId: withdrawal.userId, currency: withdrawal.currency } },
        data: {
          locked: { decrement: totalDeduction },
        },
      });

      const updated = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });

      return {
        id: updated.id,
        status: updated.status,
      };
    });
  }

  getNetworkFee(currency: string): string {
    return NETWORK_FEES[currency.toUpperCase()] ?? '0';
  }
}
