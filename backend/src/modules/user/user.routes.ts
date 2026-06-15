import type { FastifyPluginAsync } from 'fastify';
import { UserService } from './user.service.js';
import { updateProfileSchema, kycUploadSchema } from './user.schemas.js';
import { extractBearerToken, verifyAccessToken } from '../../lib/tokens.js';

const userService = new UserService();

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Middleware to verify token for all user routes
  app.addHook('preHandler', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub };
    } catch (err) {
      return reply.code(401).send({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }
  });

  app.get('/profile', async (request) => {
    const data = await userService.getProfile(request.user.id);
    return { success: true, data };
  });

  app.put('/profile', async (request) => {
    const body = updateProfileSchema.parse(request.body);
    const data = await userService.updateProfile(request.user.id, body);
    return { success: true, data };
  });

  app.get('/kyc/status', async (request) => {
    const data = await userService.getKycStatus(request.user.id);
    return { success: true, data };
  });

  app.post('/kyc/upload', async (request) => {
    const body = kycUploadSchema.parse(request.body);
    const data = await userService.uploadKycDocument(request.user.id, body);
    return { success: true, data };
  });
};
