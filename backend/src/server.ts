import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { buildApp } from './app.js';
import { WebSocketPricingService } from './modules/trading/websocket.pricing.js';
import { MatchingEngine } from './modules/trading/matching.engine.js';

const app = buildApp();

async function start() {
  try {
    await prisma.$connect();
    WebSocketPricingService.start();
    MatchingEngine.startReconciliationPolling();
    await app.listen({
      host: env.HOST,
      port: env.PORT
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  // app.log.info(`Received ${signal}, shutting down`);
  WebSocketPricingService.stop();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void start();
