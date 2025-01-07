import { z } from 'zod';

export const createSpaceSchema = z.object({
  name: z.string()
    .min(5, 'Space name must be at least 5 characters long')
    .max(50, 'Space name cannot exceed 50 characters'),
  description: z.string()
    .min(8, 'Description must be at least 8 characters long')
    .max(500, 'Description cannot exceed 500 characters'),
  avatarUrl: z.string().nullable(),
  settings: z.object({
    isPublic: z.boolean(),
    allowGuests: z.boolean(),
    defaultRoleId: z.string()
  })
}); 