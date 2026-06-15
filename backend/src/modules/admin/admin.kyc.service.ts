import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export class AdminKycService {
  async getPendingKycUsers() {
    return prisma.user.findMany({
      where: {
        OR: [
          {
            profile: {
              kycStatus: 'PENDING'
            }
          },
          {
            kycDocuments: {
              some: {
                status: 'PENDING'
              }
            }
          }
        ]
      },
      include: {
        profile: true,
        kycDocuments: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approveUserKyc(userId: string) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      await tx.userProfile.upsert({
        where: { userId },
        update: { kycStatus: 'APPROVED' },
        create: { userId, kycStatus: 'APPROVED' }
      });

      await tx.kycDocument.updateMany({
        where: { userId, status: 'PENDING' },
        data: { status: 'APPROVED' }
      });

      return { message: 'KYC approved successfully' };
    });
  }

  async rejectUserKyc(userId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new AppError(400, 'REJECTION_REASON_REQUIRED', 'Rejection reason is required');
    }

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      await tx.userProfile.upsert({
        where: { userId },
        update: { kycStatus: 'REJECTED' },
        create: { userId, kycStatus: 'REJECTED' }
      });

      await tx.kycDocument.updateMany({
        where: { userId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: reason.trim()
        }
      });

      return { message: 'KYC rejected successfully' };
    });
  }
}
