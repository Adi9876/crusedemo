import { z } from 'zod';

export const createOrderSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  type: z.enum(['LIMIT', 'MARKET', 'STOP']),
  side: z.enum(['BUY', 'SELL']),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid positive decimal number'),
  price: z.string().regex(/^\d+(\.\d+)?$/, 'Price must be a valid positive decimal number').optional(),
  stopPrice: z.string().regex(/^\d+(\.\d+)?$/, 'Stop price must be a valid positive decimal number').optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'LIMIT' && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Price is required for LIMIT orders',
      path: ['price'],
    });
  }

  if (data.type === 'STOP') {
    if (!data.stopPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Stop price is required for STOP orders',
        path: ['stopPrice'],
      });
    }
    if (!data.price) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Limit price is required for STOP-LIMIT orders',
        path: ['price'],
      });
    }
  }
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
