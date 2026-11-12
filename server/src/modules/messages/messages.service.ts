import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { createCursorFromMessage, getCursorPaginationArgs } from '../../utils/pagination';

const messageInclude = {
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
    },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      isDeleted: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  },
  attachments: {
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      storagePath: true,
      thumbnailPath: true,
    },
  },
};

function sanitizeMessage<
  T extends {
    isDeleted: boolean;
    content: string;
    attachments?: unknown[];
    replyTo?: { id: string; content: string; isDeleted?: boolean; user: { id: string; username: string; displayName: string } } | null;
  }
>(message: T) {
  return {
    ...message,
    content: message.isDeleted ? 'Сообщение удалено' : message.content,
    attachments: message.isDeleted ? [] : message.attachments ?? [],
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.isDeleted ? 'Сообщение удалено' : message.replyTo.content,
          user: message.replyTo.user,
        }
      : null,
  };
}

export class MessagesService {
  static async getByRoom(roomId: string, cursor?: string, limit: number = 50) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const pagination = getCursorPaginationArgs(cursor, safeLimit + 1);

    const rows = await prisma.message.findMany({
      where: {
        roomId,
        ...pagination.where,
      },
      orderBy: pagination.orderBy,
      take: pagination.take,
      include: messageInclude,
    });

    const hasMore = rows.length > safeLimit;
    const items = hasMore ? rows.slice(0, safeLimit) : rows;
    const nextCursor =
      hasMore && items.length > 0 ? createCursorFromMessage(items[items.length - 1]) : null;

    return {
      messages: items.map(sanitizeMessage),
      nextCursor,
      hasMore,
    };
  }

  static async create(roomId: string, userId: string, content: string, replyToId?: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.isArchived) {
      throw new AppError('Room not found or archived', 404);
    }

    if (replyToId) {
      const replyTarget = await prisma.message.findUnique({ where: { id: replyToId } });
      if (!replyTarget || replyTarget.roomId !== roomId) {
        throw new AppError('Reply target message not found in this room', 404);
      }
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        userId,
        content,
        replyToId: replyToId || null,
      },
      include: messageInclude,
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return sanitizeMessage(message);
  }

  static async update(messageId: string, userId: string, content: string) {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { select: { isArchived: true } } },
    });
    if (!existing) {
      throw new AppError('Message not found', 404);
    }

    if (existing.room.isArchived) {
      throw new AppError('Cannot edit messages in an archived room', 400);
    }

    if (existing.isDeleted) {
      throw new AppError('Cannot edit a deleted message', 400);
    }

    if (existing.userId !== userId) {
      throw new AppError('You can only edit your own messages', 403);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
      },
      include: messageInclude,
    });

    return sanitizeMessage(updated);
  }

  static async delete(messageId: string, userId: string, userRole: string) {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { select: { isArchived: true } } },
    });
    if (!existing) {
      throw new AppError('Message not found', 404);
    }

    if (existing.room.isArchived) {
      throw new AppError('Cannot delete messages in an archived room', 400);
    }

    const isAuthor = existing.userId === userId;
    const isSystemPrivileged = ['owner', 'admin', 'moderator'].includes(userRole);

    let isRoomPrivileged = false;
    if (!isAuthor && !isSystemPrivileged) {
      const membership = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId: existing.roomId } },
      });
      isRoomPrivileged = !!membership && ['admin', 'moderator'].includes(membership.role);
    }

    if (!isAuthor && !isSystemPrivileged && !isRoomPrivileged) {
      throw new AppError('You do not have permission to delete this message', 403);
    }

    const deleted = await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
      include: messageInclude,
    });

    return sanitizeMessage(deleted);
  }

  static async togglePin(messageId: string, roomId: string) {
    const existing = await prisma.message.findUnique({
      where: { id: messageId },
      include: { room: { select: { isArchived: true } } },
    });
    if (!existing || existing.roomId !== roomId) {
      throw new AppError('Message not found in this room', 404);
    }

    if (existing.room.isArchived) {
      throw new AppError('Cannot pin messages in an archived room', 400);
    }

    if (existing.isDeleted) {
      throw new AppError('Cannot pin a deleted message', 400);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !existing.isPinned },
      include: messageInclude,
    });

    return sanitizeMessage(updated);
  }

  static async search(roomId: string, query: string, limit: number = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        content: {
          contains: query,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      include: messageInclude,
    });

    return messages.map(sanitizeMessage);
  }

  static async getPinnedMessages(roomId: string) {
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        isPinned: true,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      include: messageInclude,
    });

    return messages.map(sanitizeMessage);
  }
}
