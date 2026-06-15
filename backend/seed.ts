import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'test@test.com';
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('Password123', 10),
        firstName: 'Test',
        lastName: 'User',
      }
    });
    console.log('Created test user:', user.id);
  } else {
    console.log('Found test user:', user.id);
  }

  // Inject 10,000 USDT
  const wallet = await prisma.wallet.upsert({
    where: { userId_currency: { userId: user.id, currency: 'USDT' } },
    update: { balance: 10000 },
    create: {
      userId: user.id,
      currency: 'USDT',
      balance: 10000,
      locked: 0
    }
  });
  
  console.log('User USDT wallet balance set to:', wallet.balance.toString());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
