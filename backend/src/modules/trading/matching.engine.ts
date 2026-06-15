import { PrismaClient, Prisma } from '@prisma/client';
import type { Order, Trade } from '@prisma/client';
import { MarketService } from '../market/market.service.js';
import { prisma } from '../../lib/prisma.js';
import { ExchangeService } from './exchange.service.js';
import { env } from '../../config/env.js';

const marketService = new MarketService();
const exchangeService = new ExchangeService();

export class MatchingEngine {
  /**
   * Process a single order for matching and execution.
   */
  static async processOrder(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'FILLED' || order.status === 'CANCELLED' || order.status === 'REJECTED') {
      return;
    }

    if (order.status === 'PENDING') {
      // Stop order waiting for trigger, do not match yet
      return;
    }

    // 1. Fetch current ticker price first (outside transaction)
    let currentMarketPrice = 0;
    try {
      const ticker = await marketService.getTicker(order.symbol);
      currentMarketPrice = ticker ? ticker.price : 0;
    } catch (err) {
      console.error(`Error fetching ticker price for ${order.symbol}:`, err);
    }

    // 2. Fetch candidates for internal matching
    // If order is BUY, match with open SELL orders
    // If order is SELL, match with open BUY orders
    const counterpartyOrders = await prisma.order.findMany({
      where: {
        symbol: order.symbol,
        side: order.side === 'BUY' ? 'SELL' : 'BUY',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
        userId: { not: order.userId }, // Do not match with self
      },
      orderBy: [
        { price: order.side === 'BUY' ? 'asc' : 'desc' }, // BUY matches lowest Sell price first; SELL matches highest Buy price first
        { createdAt: 'asc' } // Time priority
      ],
    });

    let remainingToFill = new Prisma.Decimal(order.remainingAmount);

    // 3. Loop through counterparties and match internally
    for (const counterparty of counterpartyOrders) {
      if (remainingToFill.lte(0)) break;

      const orderPrice = order.price ? new Prisma.Decimal(order.price) : null;
      const counterPrice = counterparty.price ? new Prisma.Decimal(counterparty.price) : null;

      // Check if price crosses
      let doesCross = false;
      let executionPrice = new Prisma.Decimal(0);

      if (order.type === 'MARKET') {
        doesCross = true;
        executionPrice = counterPrice!;
      } else if (orderPrice && counterPrice) {
        if (order.side === 'BUY') {
          // Buy order price must be >= Sell order price
          doesCross = orderPrice.gte(counterPrice);
        } else {
          // Sell order price must be <= Buy order price
          doesCross = orderPrice.lte(counterPrice);
        }
        executionPrice = counterPrice; // Maker price rules (resting order price)
      }

      if (doesCross) {
        const matchAmount = Prisma.Decimal.min(remainingToFill, new Prisma.Decimal(counterparty.remainingAmount));
        if (matchAmount.gt(0)) {
          const fillResult = await this.executeInternalTrade(order.id, counterparty.id, matchAmount, executionPrice);
          if (fillResult) {
            remainingToFill = remainingToFill.minus(matchAmount);
          }
        }
      }
    }

    // 4. Handle remaining amount by routing to external liquidity if applicable
    if (remainingToFill.gt(0)) {
      let shouldRouteExternal = false;
      let executionPrice = new Prisma.Decimal(currentMarketPrice);

      if (order.type === 'MARKET') {
        shouldRouteExternal = true;
      } else if (order.price) {
        const limitPrice = new Prisma.Decimal(order.price);
        if (order.side === 'BUY' && limitPrice.gte(currentMarketPrice)) {
          shouldRouteExternal = true;
          // Execute at ticker price (or limit price, whichever is better for the user)
          executionPrice = Prisma.Decimal.min(limitPrice, new Prisma.Decimal(currentMarketPrice));
        } else if (order.side === 'SELL' && limitPrice.lte(currentMarketPrice)) {
          shouldRouteExternal = true;
          executionPrice = Prisma.Decimal.max(limitPrice, new Prisma.Decimal(currentMarketPrice));
        }
      }

      if (shouldRouteExternal && executionPrice.gt(0)) {
        await this.executeExternalTrade(order.id, remainingToFill, executionPrice);
      }
    }
  }

  /**
   * Executes a trade between two internal orders atomically.
   */
  private static async executeInternalTrade(
    takerOrderId: string,
    makerOrderId: string,
    amount: Prisma.Decimal,
    price: Prisma.Decimal
  ): Promise<boolean> {
    try {
      return await prisma.$transaction(async (tx) => {
        // Fetch fresh copies of orders inside transaction
        const taker = await tx.order.findUnique({ where: { id: takerOrderId } });
        const maker = await tx.order.findUnique({ where: { id: makerOrderId } });

        if (!taker || !maker) return false;
        if (taker.status === 'FILLED' || taker.status === 'CANCELLED' || maker.status === 'FILLED' || maker.status === 'CANCELLED') {
          return false;
        }

        const takerRemaining = new Prisma.Decimal(taker.remainingAmount);
        const makerRemaining = new Prisma.Decimal(maker.remainingAmount);
        const matchAmount = Prisma.Decimal.min(amount, takerRemaining, makerRemaining);

        if (matchAmount.lte(0)) return false;

        const buyerOrder = taker.side === 'BUY' ? taker : maker;
        const sellerOrder = taker.side === 'SELL' ? taker : maker;

        const tradePrice = price;
        const totalCost = matchAmount.times(tradePrice);
        const feePercent = new Prisma.Decimal('0.001'); // 0.1% fee

        // 1. Process wallets for Buyer
        const lockedPrice = buyerOrder.lockedUsdtPerUnit
          ? new Prisma.Decimal(buyerOrder.lockedUsdtPerUnit)
          : (buyerOrder.type === 'MARKET' ? tradePrice : new Prisma.Decimal(buyerOrder.price!));
        const buyerLockedDeduction = matchAmount.times(lockedPrice);
        await tx.wallet.update({
          where: { userId_currency: { userId: buyerOrder.userId, currency: 'USDT' } },
          data: {
            balance: { decrement: totalCost },
            locked: { decrement: buyerLockedDeduction },
          },
        });

        const baseCurrency = taker.symbol.split('/')[0] || 'BTC';
        const quoteCurrency = taker.symbol.split('/')[1] || 'USDT';

        // Add base currency to buyer
        const buyerAssetAmount = matchAmount.times(new Prisma.Decimal(1).minus(feePercent));
        await tx.wallet.upsert({
          where: { userId_currency: { userId: buyerOrder.userId, currency: baseCurrency } },
          create: {
            userId: buyerOrder.userId,
            currency: baseCurrency,
            balance: buyerAssetAmount,
            locked: 0,
          },
          update: {
            balance: { increment: buyerAssetAmount },
          },
        });

        // 2. Process wallets for Seller
        await tx.wallet.update({
          where: { userId_currency: { userId: sellerOrder.userId, currency: baseCurrency } },
          data: {
            balance: { decrement: matchAmount },
            locked: { decrement: matchAmount },
          },
        });

        // Add USDT to seller
        const sellerUsdtAmount = totalCost.times(new Prisma.Decimal(1).minus(feePercent));
        await tx.wallet.upsert({
          where: { userId_currency: { userId: sellerOrder.userId, currency: 'USDT' } },
          create: {
            userId: sellerOrder.userId,
            currency: 'USDT',
            balance: sellerUsdtAmount,
            locked: 0,
          },
          update: {
            balance: { increment: sellerUsdtAmount },
          },
        });

        // 3. Create Trade record
        await tx.trade.create({
          data: {
            symbol: taker.symbol,
            price: tradePrice,
            amount: matchAmount,
            makerOrderId: maker.id,
            takerOrderId: taker.id,
            buyerId: buyerOrder.userId,
            sellerId: sellerOrder.userId,
          },
        });

        // 4. Update Taker Order
        const newTakerFilled = new Prisma.Decimal(taker.filledAmount).plus(matchAmount);
        const newTakerRemaining = takerRemaining.minus(matchAmount);
        const takerStatus = newTakerRemaining.lte(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        await tx.order.update({
          where: { id: taker.id },
          data: {
            filledAmount: newTakerFilled,
            remainingAmount: newTakerRemaining,
            status: takerStatus,
          },
        });

        // 5. Update Maker Order
        const newMakerFilled = new Prisma.Decimal(maker.filledAmount).plus(matchAmount);
        const newMakerRemaining = makerRemaining.minus(matchAmount);
        const makerStatus = newMakerRemaining.lte(0) ? 'FILLED' : 'PARTIALLY_FILLED';
        await tx.order.update({
          where: { id: maker.id },
          data: {
            filledAmount: newMakerFilled,
            remainingAmount: newMakerRemaining,
            status: makerStatus,
          },
        });

        return true;
      });
    } catch (err) {
      console.error('Failed to execute internal trade transaction:', err);
      return false;
    }
  }

  private static async executeExternalTrade(
    orderId: string,
    amount: Prisma.Decimal,
    price: Prisma.Decimal
  ): Promise<boolean> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'FILLED' || order.status === 'CANCELLED' || order.status === 'REJECTED') {
      return false;
    }

    const remaining = new Prisma.Decimal(order.remainingAmount);
    const fillAmount = Prisma.Decimal.min(amount, remaining);

    if (fillAmount.lte(0)) return false;

    try {
      // 1. Send order to external exchange (Bybit)
      const exchangeResult = await exchangeService.createSpotOrder(
        order.symbol,
        order.side as 'BUY' | 'SELL',
        order.type as 'LIMIT' | 'MARKET',
        fillAmount.toString(),
        order.price ? order.price.toString() : undefined
      );

      if (exchangeResult.status === 'PENDING_EXTERNAL') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'PENDING_EXTERNAL',
            externalOrderId: exchangeResult.orderId,
          },
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error(`[MatchingEngine] Real-world routing execution failed for Order ${orderId}:`, err);

      // Handle Fail: Reject order locally and release locked balance
      try {
        await prisma.$transaction(async (tx) => {
          const freshOrder = await tx.order.findUnique({ where: { id: orderId } });
          if (!freshOrder || freshOrder.status === 'FILLED' || freshOrder.status === 'CANCELLED' || freshOrder.status === 'REJECTED') {
            return;
          }

          const remainingAmount = new Prisma.Decimal(freshOrder.remainingAmount);
          let refundCurrency: string;
          let refundAmount: Prisma.Decimal;

          if (freshOrder.side === 'BUY') {
            refundCurrency = 'USDT';
            const lockedPrice = freshOrder.lockedUsdtPerUnit
              ? new Prisma.Decimal(freshOrder.lockedUsdtPerUnit)
              : (freshOrder.price ? new Prisma.Decimal(freshOrder.price) : price);
            refundAmount = remainingAmount.times(lockedPrice);
          } else {
            refundCurrency = freshOrder.symbol;
            refundAmount = remainingAmount;
          }

          if (refundAmount.gt(0)) {
            await tx.wallet.update({
              where: { userId_currency: { userId: freshOrder.userId, currency: refundCurrency } },
              data: { locked: { decrement: refundAmount } },
            });
          }

          await tx.order.update({
            where: { id: orderId },
            data: { status: 'REJECTED' },
          });
        });
      } catch (refundErr) {
        console.error(`[MatchingEngine] Critical error: failed to refund locked balance for failed order ${orderId}:`, refundErr);
      }

      return false;
    }
  }

  /**
   * Scans the database and triggers pending stop-loss / stop-limit orders or matches open orders that cross new market prices.
   */
  static async checkMarketPriceUpdates(symbol: string, newPrice: number): Promise<void> {
    const decimalPrice = new Prisma.Decimal(newPrice);

    // 1. Find and trigger STOP orders
    const pendingStopOrders = await prisma.order.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        type: 'STOP',
        status: 'PENDING',
      },
    });

    for (const stopOrder of pendingStopOrders) {
      if (!stopOrder.stopPrice) continue;
      const stopPriceDec = new Prisma.Decimal(stopOrder.stopPrice);
      let trigger = false;

      if (stopOrder.side === 'BUY') {
        // Trigger Buy Stop when price rises to or above stopPrice
        trigger = decimalPrice.gte(stopPriceDec);
      } else {
        // Trigger Sell Stop when price falls to or below stopPrice
        trigger = decimalPrice.lte(stopPriceDec);
      }

      if (trigger) {
        // Trigger stop order by changing status to OPEN, and then processing it
        await prisma.order.update({
          where: { id: stopOrder.id },
          data: { status: 'OPEN' },
        });
        // Run processing in background
        void this.processOrder(stopOrder.id);
      }
    }

    // 2. Find and execute open LIMIT orders that cross current market price
    const openLimitOrders = await prisma.order.findMany({
      where: {
        symbol: symbol.toUpperCase(),
        type: 'LIMIT',
        status: { in: ['OPEN', 'PARTIALLY_FILLED'] },
      },
    });

    for (const limitOrder of openLimitOrders) {
      if (!limitOrder.price) continue;
      const limitPriceDec = new Prisma.Decimal(limitOrder.price);
      let crosses = false;

      if (limitOrder.side === 'BUY') {
        // Buy limit crosses if market price is <= limit price
        crosses = decimalPrice.lte(limitPriceDec);
      } else {
        // Sell limit crosses if market price is >= limit price
        crosses = decimalPrice.gte(limitPriceDec);
      }

      if (crosses) {
        void this.processOrder(limitOrder.id);
      }
    }
  }

  /**
   * Process a confirmed fill from Bybit and update local wallets.
   */
  static async processExternalFill(
    orderId: string,
    externalOrderId: string,
    actualFillAmount: Prisma.Decimal,
    actualPrice: Prisma.Decimal
  ): Promise<boolean> {
    try {
      return await prisma.$transaction(async (tx) => {
        const freshOrder = await tx.order.findUnique({ where: { id: orderId } });
        if (!freshOrder || freshOrder.status === 'FILLED' || freshOrder.status === 'CANCELLED') {
          return false; // Already processed
        }

        const totalCost = actualFillAmount.times(actualPrice);
        const feePercent = new Prisma.Decimal('0.001'); // 0.1% platform fee

        if (freshOrder.side === 'BUY') {
          const lockedPrice = freshOrder.lockedUsdtPerUnit
            ? new Prisma.Decimal(freshOrder.lockedUsdtPerUnit)
            : (freshOrder.type === 'MARKET' ? actualPrice : new Prisma.Decimal(freshOrder.price!));
          const lockedDeduction = actualFillAmount.times(lockedPrice);

          // Update buyer wallet (USDT)
          await tx.wallet.update({
            where: { userId_currency: { userId: freshOrder.userId, currency: 'USDT' } },
            data: {
              balance: { decrement: totalCost },
              locked: { decrement: lockedDeduction },
            },
          });

          // Add base asset to buyer
          const buyerAssetAmount = actualFillAmount.times(new Prisma.Decimal(1).minus(feePercent));
          await tx.wallet.upsert({
            where: { userId_currency: { userId: freshOrder.userId, currency: freshOrder.symbol } },
            create: { userId: freshOrder.userId, currency: freshOrder.symbol, balance: buyerAssetAmount, locked: 0 },
            update: { balance: { increment: buyerAssetAmount } },
          });
        } else {
          // Update seller wallet (base currency)
          await tx.wallet.update({
            where: { userId_currency: { userId: freshOrder.userId, currency: freshOrder.symbol } },
            data: {
              balance: { decrement: actualFillAmount },
              locked: { decrement: actualFillAmount },
            },
          });

          // Add USDT to seller
          const sellerUsdtAmount = totalCost.times(new Prisma.Decimal(1).minus(feePercent));
          await tx.wallet.upsert({
            where: { userId_currency: { userId: freshOrder.userId, currency: 'USDT' } },
            create: { userId: freshOrder.userId, currency: 'USDT', balance: sellerUsdtAmount, locked: 0 },
            update: { balance: { increment: sellerUsdtAmount } },
          });
        }

        // Ensure a platform/system user exists
        let platformUserId = env.PLATFORM_USER_ID;
        if (!platformUserId) {
          let platformUser = await tx.user.findFirst({ where: { email: 'system@crusex.com' } });
          if (!platformUser) {
            platformUser = await tx.user.create({
              data: {
                email: 'system@crusex.com',
                passwordHash: 'SYSTEM_USER_NO_PASSWORD',
                firstName: 'System',
                lastName: 'Platform',
                role: 'ADMIN',
                status: 'ACTIVE',
              }
            });
          }
          platformUserId = platformUser.id;
        }

        // We create a dummy external order in the DB to serve as the maker for the trade history
        const systemOrderId = await tx.order.create({
          data: {
            userId: platformUserId,
            symbol: freshOrder.symbol,
            type: freshOrder.type,
            side: freshOrder.side === 'BUY' ? 'SELL' : 'BUY',
            status: 'FILLED',
            price: actualPrice,
            amount: actualFillAmount,
            filledAmount: actualFillAmount,
            remainingAmount: 0,
            externalOrderId: externalOrderId,
          },
        });

        // Create Trade record
        await tx.trade.create({
          data: {
            symbol: freshOrder.symbol,
            price: actualPrice,
            amount: actualFillAmount,
            makerOrderId: freshOrder.side === 'BUY' ? systemOrderId.id : freshOrder.id,
            takerOrderId: freshOrder.side === 'BUY' ? freshOrder.id : systemOrderId.id,
            buyerId: freshOrder.side === 'BUY' ? freshOrder.userId : platformUserId,
            sellerId: freshOrder.side === 'SELL' ? freshOrder.userId : platformUserId,
          },
        });

        // Update the order fill state
        const newFilled = new Prisma.Decimal(freshOrder.filledAmount).plus(actualFillAmount);
        const newRemaining = new Prisma.Decimal(freshOrder.remainingAmount).minus(actualFillAmount);
        const newStatus = newRemaining.lte(0) ? 'FILLED' : 'PARTIALLY_FILLED';

        await tx.order.update({
          where: { id: freshOrder.id },
          data: {
            filledAmount: newFilled,
            remainingAmount: newRemaining,
            status: newStatus,
          },
        });

        return true;
      });
    } catch (err) {
      console.error(`[MatchingEngine] Failed to process external fill for ${orderId}:`, err);
      return false;
    }
  }

  static startReconciliationPolling() {
    console.log('[MatchingEngine] Starting external order reconciliation polling...');
    setInterval(async () => {
      try {
        const pendingOrders = await prisma.order.findMany({
          where: { status: 'PENDING_EXTERNAL', externalOrderId: { not: null } },
        });

        for (const order of pendingOrders) {
          try {
            const externalStatus = await exchangeService.getExternalOrderStatus(order.externalOrderId!, order.symbol);
            
            // Bybit statuses: New, PartiallyFilled, Filled, Cancelled, Rejected
            if (externalStatus.status === 'Filled' || externalStatus.status === 'PartiallyFilled') {
              const cumExecQty = new Prisma.Decimal(externalStatus.executedQty || '0');
              const cumExecValue = new Prisma.Decimal(externalStatus.cummulativeQuoteQty || '0');
              
              const currentFilled = new Prisma.Decimal(order.filledAmount);
              if (cumExecQty.gt(currentFilled)) {
                // Calculate the newly filled portion
                const newFillAmount = cumExecQty.minus(currentFilled);
                // Average price of the fill
                const avgPrice = cumExecQty.gt(0) ? cumExecValue.dividedBy(cumExecQty) : new Prisma.Decimal(0);
                
                if (avgPrice.gt(0)) {
                  await MatchingEngine.processExternalFill(order.id, order.externalOrderId!, newFillAmount, avgPrice);
                }
              }
            } else if (externalStatus.status === 'Cancelled' || externalStatus.status === 'Rejected') {
              // Order was cancelled or rejected externally, we should refund the locked amount
              const remainingAmount = new Prisma.Decimal(order.remainingAmount);
              
              await prisma.$transaction(async (tx) => {
                let refundCurrency: string;
                let refundAmount: Prisma.Decimal;
                
                if (order.side === 'BUY') {
                  refundCurrency = 'USDT';
                  const lockedPrice = order.lockedUsdtPerUnit
                    ? new Prisma.Decimal(order.lockedUsdtPerUnit)
                    : (order.price ? new Prisma.Decimal(order.price) : new Prisma.Decimal(0));
                  refundAmount = remainingAmount.times(lockedPrice);
                } else {
                  refundCurrency = order.symbol;
                  refundAmount = remainingAmount;
                }
                
                if (refundAmount.gt(0)) {
                  await tx.wallet.update({
                    where: { userId_currency: { userId: order.userId, currency: refundCurrency } },
                    data: { locked: { decrement: refundAmount } },
                  });
                }
                
                await tx.order.update({
                  where: { id: order.id },
                  data: { status: externalStatus.status.toUpperCase() as 'CANCELLED' | 'REJECTED' },
                });
              });
              console.log(`[MatchingEngine] Order ${order.id} was ${externalStatus.status} on Bybit. Refunded ${remainingAmount.toString()}.`);
            }
          } catch (err) {
            console.error(`[MatchingEngine] Failed to reconcile order ${order.id}:`, err);
          }
        }
      } catch (err) {
        console.error('[MatchingEngine] Reconciliation loop error:', err);
      }
    }, 5000); // Poll every 5 seconds
  }
}
