import { prisma } from './src/lib/prisma.js';

async function main() {
  const email = 'test@test.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log('User not found!');
    return;
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id }
  });

  console.log('--- USER WALLETS ---');
  console.table(wallets.map(w => ({ currency: w.currency, balance: w.balance.toString(), locked: w.locked.toString() })));

  console.log('\n--- USER ORDERS ---');
  console.table(orders.map(o => ({
    id: o.id.split('-')[0] + '...',
    symbol: o.symbol,
    type: o.type,
    side: o.side,
    price: o.price?.toString() || 'MARKET',
    amount: o.amount.toString(),
    filled: o.filled.toString(),
    status: o.status,
    externalId: o.externalOrderId || 'N/A'
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
