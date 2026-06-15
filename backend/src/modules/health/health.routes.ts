import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    success: true,
    data: {
      status: 'ok',
      service: 'crusex-auth-service',
      timestamp: new Date().toISOString()
    }
  }));
};
