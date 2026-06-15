import { z } from 'zod';

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export const registerBodySchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30).optional(),
  dateOfBirth: z.string().optional(),
  addressLine1: z.string().trim().min(3).max(150).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  postalCode: z.string().trim().min(3).max(20).optional(),
  country: z.string().trim().min(2).max(100).optional(),
  password: z
    .string()
    .regex(
      passwordPolicy,
      'Password must be 8-72 characters and include uppercase, lowercase, and a number'
    ),
  acceptTerms: z.literal(true),
  deviceName: z.string().trim().min(1).max(100).optional()
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
  deviceName: z.string().trim().min(1).max(100).optional()
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(32)
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(32).optional(),
  logoutAll: z.boolean().optional().default(false)
});

export const resendVerificationBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase())
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;

