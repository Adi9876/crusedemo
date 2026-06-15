import { PrismaClient } from '@prisma/client';
import type { UpdateProfileInput, KycUploadInput } from './user.schemas.js';

const prisma = new PrismaClient();

export class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycDocuments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const { firstName, lastName, phone, dateOfBirth, ...profileData } = data;

    // Update User fields
    if (firstName || lastName || phone || dateOfBirth) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(phone && { phone }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        },
      });
    }

    // Update or Create UserProfile
    if (Object.keys(profileData).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: {
          userId,
          ...profileData,
        },
      });
    }

    return this.getProfile(userId);
  }

  async uploadKycDocument(userId: string, data: KycUploadInput) {
    // Create the document record
    const document = await prisma.kycDocument.create({
      data: {
        userId,
        type: data.type,
        fileUrl: data.fileUrl,
        status: 'PENDING',
      },
    });

    // Update profile KYC status to PENDING if it was NOT_STARTED or REJECTED
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile || profile.kycStatus === 'NOT_STARTED' || profile.kycStatus === 'REJECTED') {
      await prisma.userProfile.upsert({
        where: { userId },
        update: { kycStatus: 'PENDING' },
        create: {
          userId,
          kycStatus: 'PENDING',
        },
      });
    }

    return document;
  }

  async getKycStatus(userId: string) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { kycStatus: true }
    });

    const documents = await prisma.kycDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      kycStatus: profile?.kycStatus || 'NOT_STARTED',
      documents
    };
  }
}
