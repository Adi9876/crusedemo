import { z } from 'zod';

export const depositSchema = z.object({
  currency: z.string().min(1).max(10).toUpperCase(),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid decimal number'),
  network: z.string().min(1).max(50),
  txHash: z.string().optional(),
});

export const withdrawalSchema = z.object({
  currency: z.string().min(1).max(10).toUpperCase(),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Must be a valid decimal number'),
  network: z.string().min(1).max(50),
  toAddress: z.string().min(10).max(256),
});

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
