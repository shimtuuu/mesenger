import { Server, Socket } from 'socket.io';
import prisma from '../../config/database';
import { MessagesService } from '../../modules/messages/messages.service';
import { RoomsService } from '../../modules/rooms/rooms.service';
import { sendMessageSchema, updateMessageSchema } from '../../modules/messages/messages.validation';
import { clearUserTypingInRoom } from './typing.handler';
import { createAuditLog } from '../../services/audit.service';
import { notifyRoomUnread } from '../unread';

type AckCallback = (response: { ok: boolean; data?: unknown; error?: string }) => void;

async function ensureSocketRoomAccess(roomId: string, userId: string, userRole: string): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || room.isArchived) {
    throw new Error('Room not found or archived');
  }

  const memberRole = await RoomsService.isUserMember(roomId, userId);
  if (!memberRole && userRole !== 'admin' && userRole !== 'owner') {
    throw new Error('You are not a member of this room');
  }
}

export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;
  const userRole = (socket.data.role as string) || 'member';

  socket.on(
    'message:send',
    async (
      payload: { roomId?: string; content?: string; replyToId?: string },
      callback?: AckCallback
    ) => {
      try {
        if (!payload?.roomId || typeof payload.roomId !== 'string') {
          throw new Error('Room ID is required');
        }

        const parsed = sendMessageSchema.safeParse({
          content: payload.content,
          replyToId: payload.replyToId,
        });
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || 'Invalid message payload');
        }

        await ensureSocketRoomAccess(payload.roomId, userId, userRole);

        const message = await MessagesService.create(
          payload.roomId,
          userId,
          parsed.data.content,
          parsed.data.replyToId
        );

        clearUserTypingInRoom(io, payload.roomId, userId);
        io.to(payload.roomId).emit('message:new', message);
        await notifyRoomUnread(io, payload.roomId, userId);

        if (typeof callback === 'function') {
          callback({ ok: true, data: message });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message';
        if (typeof callback === 'function') {
          callback({ ok: false, error: message });
        } else {
          socket.emit('error', { message });
        }
      }
    }
  );

  socket.on(
    'message:edit',
    async (
      payload: { messageId?: string; id?: string; content?: string },
      callback?: AckCallback
    ) => {
      try {
        const messageId = payload?.messageId || payload?.id;
        if (!messageId || typeof messageId !== 'string') {
          throw new Error('Message ID is required');
        }

        const parsed = updateMessageSchema.safeParse({ content: payload.content });
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || 'Invalid message content');
        }

        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        if (!existing) {
          throw new Error('Message not found');
        }

        await ensureSocketRoomAccess(existing.roomId, userId, userRole);

        const updated = await MessagesService.update(messageId, userId, parsed.data.content);
        io.to(updated.roomId).emit('message:updated', updated);

        if (typeof callback === 'function') {
          callback({ ok: true, data: updated });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to edit message';
        if (typeof callback === 'function') {
          callback({ ok: false, error: message });
        } else {
          socket.emit('error', { message });
        }
      }
    }
  );

  socket.on(
    'message:delete',
    async (
      payload: string | { messageId?: string; id?: string },
      callback?: AckCallback
    ) => {
      try {
        const messageId =
          typeof payload === 'string' ? payload : payload?.messageId || payload?.id;

        if (!messageId || typeof messageId !== 'string') {
          throw new Error('Message ID is required');
        }

        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        if (!existing) {
          throw new Error('Message not found');
        }

        await ensureSocketRoomAccess(existing.roomId, userId, userRole);

        const deleted = await MessagesService.delete(messageId, userId, userRole);
        await createAuditLog(
          userId,
          'message.delete',
          'message',
          messageId,
          { roomId: deleted.roomId },
          socket.handshake.address
        );

        io.to(deleted.roomId).emit('message:deleted', {
          id: deleted.id,
          messageId: deleted.id,
          roomId: deleted.roomId,
          content: deleted.content,
          isDeleted: true,
        });

        if (typeof callback === 'function') {
          callback({ ok: true, data: deleted });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete message';
        if (typeof callback === 'function') {
          callback({ ok: false, error: message });
        } else {
          socket.emit('error', { message });
        }
      }
    }
  );
}
