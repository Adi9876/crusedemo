import { prisma } from './src/lib/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
  const accounts = [
    { email: 'abc@abc.com', pass: 'Testing@123', balances: { USDT: 100000, BTC: 1.5 } },
    { email: 'qwe@qwe.com', pass: 'Testing@123', balances: { USDT: 50000, BTC: 0.5 } }
  ];

  for (const acc of accounts) {
    let user = await prisma.user.findUnique({ where: { email: acc.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: acc.email,
          passwordHash: await bcrypt.hash(acc.pass, 10),
          firstName: acc.email.split('@')[0],
          lastName: 'Demo',
        }
      });
      console.log(`Created user: ${acc.email}`);
    }

    for (const [currency, balance] of Object.entries(acc.balances)) {
      await prisma.wallet.upsert({
        where: { userId_currency: { userId: user.id, currency } },
        update: { balance: balance, locked: 0 },
        create: { userId: user.id, currency, balance: balance, locked: 0 }
      });
      console.log(`Funded ${acc.email} with ${balance} ${currency}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
