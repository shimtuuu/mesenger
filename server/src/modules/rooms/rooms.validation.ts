import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(2, 'Room name must be at least 2 characters')
    .max(50, 'Room name must be at most 50 characters'),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private']).default('public'),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(2, 'Room name must be at least 2 characters')
    .max(50, 'Room name must be at most 50 characters')
    .optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['public', 'private']).optional(),
});

export const inviteMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const dmRoomSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type DMRoomInput = z.infer<typeof dmRoomSchema>;
