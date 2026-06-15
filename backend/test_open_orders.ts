import { TradingService } from './src/modules/trading/trading.service.js';
import { prisma } from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'abc@abc.com' } });
  if (!user) { console.log('no user'); return; }
  
  const service = new TradingService();
  try {
    const orders = await service.getOpenOrders(user.id);
    console.log('Open Orders:', orders.length);
  } catch (err) {
    console.error('Error fetching open orders:', err);
  }
}
main().catch(console.error);
