import { Request, Response, NextFunction } from 'express';
import { MessagesService } from './messages.service';
import { RoomsService } from '../rooms/rooms.service';
import { AppError } from '../../middleware/errorHandler';
import { searchSchema } from './messages.validation';
import prisma from '../../config/database';
import { getIOOptional } from '../../socket';
import { markRoomReadAndNotify, notifyRoomUnread } from '../../socket/unread';
import { createAuditLog } from '../../services/audit.service';

async function ensureRoomMember(roomId: string, userId: string, userRole: string) {
  const memberRole = await RoomsService.isUserMember(roomId, userId);
  if (!memberRole && userRole !== 'admin' && userRole !== 'owner') {
    throw new AppError('You are not a member of this room', 403);
  }
}

export class MessagesController {
  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      await ensureRoomMember(roomId, req.user!.userId, req.user!.role);

      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
      const limit = Number.isNaN(limitParam) ? 50 : limitParam;

      const result = await MessagesService.getByRoom(roomId, cursor, limit);
      if (!cursor) {
        await markRoomReadAndNotify(roomId, req.user!.userId, getIOOptional());
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      await ensureRoomMember(roomId, req.user!.userId, req.user!.role);

      const { content, replyToId } = req.body;
      const message = await MessagesService.create(roomId, req.user!.userId, content, replyToId);

      const io = getIOOptional();
      if (io) {
        io.to(roomId).emit('message:new', message);
        await notifyRoomUnread(io, roomId, req.user!.userId);
      }

      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  }

  static async updateMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = req.params.id as string;
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) {
        throw new AppError('Message not found', 404);
      }

      await ensureRoomMember(existing.roomId, req.user!.userId, req.user!.role);

      const updated = await MessagesService.update(messageId, req.user!.userId, req.body.content);

      const io = getIOOptional();
      if (io) {
        io.to(updated.roomId).emit('message:updated', updated);
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = req.params.id as string;
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) {
        throw new AppError('Message not found', 404);
      }

      await ensureRoomMember(existing.roomId, req.user!.userId, req.user!.role);

      const deleted = await MessagesService.delete(messageId, req.user!.userId, req.user!.role);
      await createAuditLog(
        req.user!.userId,
        'message.delete',
        'message',
        messageId,
        { roomId: deleted.roomId },
        req.ip
      );

      const io = getIOOptional();
      if (io) {
        io.to(deleted.roomId).emit('message:deleted', {
          id: deleted.id,
          messageId: deleted.id,
          roomId: deleted.roomId,
          content: deleted.content,
          isDeleted: true,
        });
      }

      res.json(deleted);
    } catch (err) {
      next(err);
    }
  }

  static async togglePin(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = req.params.id as string;
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) {
        throw new AppError('Message not found', 404);
      }

      await ensureRoomMember(existing.roomId, req.user!.userId, req.user!.role);

      const updated = await MessagesService.togglePin(messageId, existing.roomId);

      const io = getIOOptional();
      if (io) {
        io.to(updated.roomId).emit('message:updated', updated);
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  static async searchMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      await ensureRoomMember(roomId, req.user!.userId, req.user!.role);

      const parsed = searchSchema.safeParse({
        query: req.query.query ?? req.query.q,
        limit: req.query.limit,
      });

      if (!parsed.success) {
        throw new AppError('Search query is required', 400);
      }

      const results = await MessagesService.search(
        roomId,
        parsed.data.query,
        parsed.data.limit ?? 20
      );
      res.json(results);
    } catch (err) {
      next(err);
    }
  }

  static async getPinnedMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId as string;
      await ensureRoomMember(roomId, req.user!.userId, req.user!.role);

      const results = await MessagesService.getPinnedMessages(roomId);
      res.json(results);
    } catch (err) {
      next(err);
    }
  }
}
