import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
  replyToId: z.string().optional(),
});

export const updateMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message cannot exceed 5000 characters'),
});

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
