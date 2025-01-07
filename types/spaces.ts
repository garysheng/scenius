import { z } from 'zod';
import { AccessControl } from './index';

export const createSpaceSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  isPublic: z.boolean(),
  allowGuests: z.boolean(),
  accessControl: z.object({
    type: z.enum(['TOKEN_GATE', 'DOMAIN', 'EMAIL', 'CUSTOM', 'GUILD']),
    config: z.record(z.any()),
    combineMethod: z.enum(['AND', 'OR'])
  })
});

export type CreateSpaceFormValues = z.infer<typeof createSpaceSchema>; 