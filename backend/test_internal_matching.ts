import { prisma } from './src/lib/prisma.js';
import { MatchingEngine } from './src/modules/trading/matching.engine.js';
import { Prisma } from '@prisma/client';

async function main() {
  const engine = new MatchingEngine();
  
  const user1 = await prisma.user.findUnique({ where: { email: 'abc@abc.com' } });
  const user2 = await prisma.user.findUnique({ where: { email: 'qwe@qwe.com' } });

  // 1. ABC places a Limit SELL for 0.5 BTC at 60000 USDT.
  console.log('--- Placing SELL order for ABC ---');
  const sellOrder = await prisma.order.create({
    data: {
      userId: user1!.id,
      symbol: 'BTC/USDT',
      type: 'LIMIT',
      side: 'SELL',
      price: new Prisma.Decimal(60000),
      amount: new Prisma.Decimal(0.5),
      remainingAmount: new Prisma.Decimal(0.5),
      filledAmount: new Prisma.Decimal(0),
      status: 'OPEN',
      lockedUsdtPerUnit: new Prisma.Decimal(0),
    }
  });

  // ABC needs to lock BTC
  await prisma.wallet.update({
    where: { userId_currency: { userId: user1!.id, currency: 'BTC' } },
    data: { 
      balance: { decrement: 0.5 },
      locked: { increment: 0.5 }
    }
  });

  // Manually trigger internal matching
  await MatchingEngine.processOrder(sellOrder.id);

  // 2. QWE places a Limit BUY for 0.5 BTC at 60000 USDT.
  console.log('--- Placing BUY order for QWE ---');
  const buyOrder = await prisma.order.create({
    data: {
      userId: user2!.id,
      symbol: 'BTC/USDT',
      type: 'LIMIT',
      side: 'BUY',
      price: new Prisma.Decimal(60000),
      amount: new Prisma.Decimal(0.5),
      remainingAmount: new Prisma.Decimal(0.5),
      filledAmount: new Prisma.Decimal(0),
      status: 'OPEN',
      lockedUsdtPerUnit: new Prisma.Decimal(60000),
    }
  });

  // QWE needs to lock USDT (0.5 * 60000 = 30000)
  await prisma.wallet.update({
    where: { userId_currency: { userId: user2!.id, currency: 'USDT' } },
    data: { 
      balance: { decrement: 30000 },
      locked: { increment: 30000 }
    }
  });

  await MatchingEngine.processOrder(buyOrder.id);

  // Print outcomes
  const updatedSell = await prisma.order.findUnique({ where: { id: sellOrder.id }});
  const updatedBuy = await prisma.order.findUnique({ where: { id: buyOrder.id }});
  
  console.log('\n--- Match Results ---');
  console.log('Sell Order Status:', updatedSell?.status, '| Filled:', updatedSell?.filledAmount.toString());
  console.log('Buy Order Status:', updatedBuy?.status, '| Filled:', updatedBuy?.filledAmount.toString());

  const trades = await prisma.trade.findMany({ where: { symbol: 'BTC/USDT' }, orderBy: { executedAt: 'desc' }, take: 1 });
  console.log('\n--- Last Trade Created ---');
  console.log(trades);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
