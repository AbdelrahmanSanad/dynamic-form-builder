import { z } from 'zod';

export const registerBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1, 'Password is required').max(128),
});

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.date(),
});

export const authResponseSchema = z.object({
  user: publicUserSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
