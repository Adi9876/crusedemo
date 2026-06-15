import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const kycUploadSchema = z.object({
  type: z.enum(['PASSPORT', 'ID_CARD', 'DRIVER_LICENSE', 'SELFIE']),
  fileUrl: z.string().url(), // In a real app, this might be a multi-part form or a pre-signed URL reference
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type KycUploadInput = z.infer<typeof kycUploadSchema>;
