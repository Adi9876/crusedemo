import { PrismaClient, Prisma } from '@prisma/client';
import type { Order, Trade } from '@prisma/client';
import { AppError } from '../../lib/errors.js';
import { MarketService } from '../market/market.service.js';
import { MatchingEngine } from './matching.engine.js';
import { prisma } from '../../lib/prisma.js';
import type { CreateOrderInput } from './trading.schemas.js';

const marketService = new MarketService();

export class TradingService {
  /**
   * Create a new trading order.
   */
  async createOrder(userId: string, input: CreateOrderInput) {
    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Order amount must be greater than 0');
    }

    const price = input.price ? new Prisma.Decimal(input.price) : null;
    if (price && price.lte(0)) {
      throw new AppError(400, 'INVALID_PRICE', 'Order price must be greater than 0');
    }

    const stopPrice = input.stopPrice ? new Prisma.Decimal(input.stopPrice) : null;
    if (stopPrice && stopPrice.lte(0)) {
      throw new AppError(400, 'INVALID_STOP_PRICE', 'Stop price must be greater than 0');
    }

    // 1. Fetch current price from market service (outside transaction)
    let currentPrice = 0;
    try {
      const ticker = await marketService.getTicker(input.symbol);
      if (!ticker) {
        throw new AppError(404, 'SYMBOL_NOT_FOUND', `Unsupported market symbol: ${input.symbol}`);
      }
      currentPrice = ticker.price;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, 'MARKET_DATA_ERROR', 'Failed to retrieve current symbol price');
    }

    // 2. Determine lock currency and amount
    let lockCurrency: string;
    let lockAmount: Prisma.Decimal;
    let lockedUsdtPerUnit: Prisma.Decimal | null = null;

    if (input.side === 'BUY') {
      lockCurrency = 'USDT';
      if (input.type === 'LIMIT') {
        lockedUsdtPerUnit = price!;
      } else if (input.type === 'STOP') {
        lockedUsdtPerUnit = price || new Prisma.Decimal(currentPrice);
      } else {
        // Market order: lock based on current market price
        lockedUsdtPerUnit = new Prisma.Decimal(currentPrice);
      }
      lockAmount = amount.times(lockedUsdtPerUnit);
    } else {
      lockCurrency = input.symbol;
      lockAmount = amount;
    }

    // 3. Atomically check balance, lock wallet funds, and insert order
    const order = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: lockCurrency } },
      });

      if (!wallet) {
        throw new AppError(400, 'NO_WALLET', `No ${lockCurrency} wallet found. Deposit funds first.`);
      }

      const available = new Prisma.Decimal(wallet.balance).minus(wallet.locked);
      if (available.lt(lockAmount)) {
        throw new AppError(
          400,
          'INSUFFICIENT_BALANCE',
          `Insufficient ${lockCurrency} balance. Available: ${available.toString()}, Required: ${lockAmount.toString()}`
        );
      }

      // Lock funds
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { locked: { increment: lockAmount } },
      });

      // Create order in DB
      return tx.order.create({
        data: {
          userId,
          symbol: input.symbol,
          type: input.type,
          side: input.side,
          status: input.type === 'STOP' ? 'PENDING' : 'OPEN',
          price,
          stopPrice,
          lockedUsdtPerUnit,
          amount,
          remainingAmount: amount,
        },
      });
    });

    // 4. Trigger Matching Engine in background
    if (order.status === 'OPEN') {
      void MatchingEngine.processOrder(order.id);
    }

    // Fetch the updated order status before returning
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    const result = updatedOrder || order;

    return {
      id: result.id,
      symbol: result.symbol,
      type: result.type,
      side: result.side,
      status: result.status,
      price: result.price ? result.price.toString() : null,
      stopPrice: result.stopPrice ? result.stopPrice.toString() : null,
      amount: result.amount.toString(),
      filledAmount: result.filledAmount.toString(),
      remainingAmount: result.remainingAmount.toString(),
      createdAt: result.createdAt,
    };
  }

  /**
   * Cancel an open order and release remaining locked wallet funds.
   */
  async cancelOrder(userId: string, orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });

      if (!order) {
        throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.userId !== userId) {
        throw new AppError(403, 'FORBIDDEN', 'Cannot cancel another user\'s order');
      }

      if (order.status !== 'OPEN' && order.status !== 'PARTIALLY_FILLED' && order.status !== 'PENDING') {
        throw new AppError(400, 'INVALID_STATUS', `Cannot cancel order with status: ${order.status}`);
      }

      const remainingAmount = new Prisma.Decimal(order.remainingAmount);

      // Determine refund currency and amount
      let refundCurrency: string;
      let refundAmount: Prisma.Decimal;

      if (order.side === 'BUY') {
        refundCurrency = 'USDT';
        // Buy orders lock based on stored lockedUsdtPerUnit, fallback to price or 0 for legacy orders
        const lockedPrice = order.lockedUsdtPerUnit
          ? new Prisma.Decimal(order.lockedUsdtPerUnit)
          : (order.price ? new Prisma.Decimal(order.price) : new Prisma.Decimal(0));
        refundAmount = remainingAmount.times(lockedPrice);
      } else {
        refundCurrency = order.symbol;
        refundAmount = remainingAmount;
      }

      // Unlock funds in wallet
      if (refundAmount.gt(0)) {
        await tx.wallet.update({
          where: { userId_currency: { userId, currency: refundCurrency } },
          data: { locked: { decrement: refundAmount } },
        });
      }

      // Mark order as cancelled
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      return {
        id: cancelledOrder.id,
        symbol: cancelledOrder.symbol,
        status: cancelledOrder.status,
        remainingAmount: cancelledOrder.remainingAmount.toString(),
      };
    });
  }

  /**
   * Get all active / open orders for a user.
   */
  async getOpenOrders(userId: string) {
    // To keep the simulation feeling alive, trigger a quick price update check
    // for all symbols of the user's active orders before fetching them.
    const activeOrders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ['OPEN', 'PARTIALLY_FILLED', 'PENDING'] },
      },
      select: { symbol: true },
    });

    const activeSymbols = Array.from(new Set(activeOrders.map((o) => o.symbol)));

    for (const symbol of activeSymbols) {
      try {
        const ticker = await marketService.getTicker(symbol);
        if (ticker) {
          await MatchingEngine.checkMarketPriceUpdates(symbol, ticker.price);
        }
      } catch (err) {
        console.error(`Error updating matches on check for ${symbol}:`, err);
      }
    }

    // Now retrieve the open orders
    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ['OPEN', 'PARTIALLY_FILLED', 'PENDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      type: o.type,
      side: o.side,
      status: o.status,
      price: o.price ? o.price.toString() : null,
      stopPrice: o.stopPrice ? o.stopPrice.toString() : null,
      amount: o.amount.toString(),
      filledAmount: o.filledAmount.toString(),
      remainingAmount: o.remainingAmount.toString(),
      createdAt: o.createdAt,
    }));
  }

  /**
   * Get historical / closed orders for a user.
   */
  async getOrderHistory(userId: string) {
    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ['FILLED', 'CANCELLED', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      type: o.type,
      side: o.side,
      status: o.status,
      price: o.price ? o.price.toString() : null,
      stopPrice: o.stopPrice ? o.stopPrice.toString() : null,
      amount: o.amount.toString(),
      filledAmount: o.filledAmount.toString(),
      remainingAmount: o.remainingAmount.toString(),
      createdAt: o.createdAt,
    }));
  }

  /**
   * Get all trade fills / history for a user.
   */
  async getUserTrades(userId: string) {
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return trades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      price: t.price.toString(),
      amount: t.amount.toString(),
      side: t.buyerId === userId ? 'BUY' : 'SELL', // Relative to the querying user
      createdAt: t.createdAt,
    }));
  }
}
