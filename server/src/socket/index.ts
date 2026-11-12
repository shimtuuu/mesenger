import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from '../config/database';
import { verifyAccessToken } from '../utils/jwt';
import { UsersService } from '../modules/users/users.service';
import { RoomsService } from '../modules/rooms/rooms.service';
import { registerChatHandlers } from './handlers/chat.handler';
import { registerTypingHandlers, clearUserTypingAll } from './handlers/typing.handler';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { markRoomReadAndNotify } from './unread';

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO has not been initialized');
  }
  return ioInstance;
}

export function getIOOptional(): SocketIOServer | null {
  return ioInstance;
}

function extractRoomId(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'roomId' in payload) {
    const roomId = (payload as { roomId?: unknown }).roomId;
    return typeof roomId === 'string' ? roomId : null;
  }
  return null;
}

export function initializeSocket(io: SocketIOServer): void {
  ioInstance = io;

  io.use(async (socket: Socket, next) => {
    try {
      const authToken =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : undefined);

      if (!authToken) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(authToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.data.userId = user.id;
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId as string;
    const userRole = (socket.data.role as string) || 'member';

    try {
      await socket.join(`user:${userId}`);
      const updated = await UsersService.updatePresence(userId, 'online');

      const memberships = await prisma.roomMember.findMany({
        where: { userId },
        select: { roomId: true },
      });

      for (const membership of memberships) {
        await socket.join(membership.roomId);
      }

      io.emit('presence:changed', {
        userId,
        presence: updated.presence,
        lastSeenAt: updated.lastSeenAt,
      });
    } catch (err) {
      console.error('Error initializing socket connection:', err);
    }

    socket.on('room:join', async (payload: unknown) => {
      try {
        const roomId = extractRoomId(payload);
        if (!roomId) return;

        const room = await prisma.room.findUnique({ where: { id: roomId } });
        if (!room || room.isArchived) return;

        const memberRole = await RoomsService.isUserMember(roomId, userId);
        if (memberRole || room.type === 'public' || userRole === 'admin' || userRole === 'owner') {
          await socket.join(roomId);
          socket.data.activeRoomId = roomId;
          if (memberRole) {
            await markRoomReadAndNotify(roomId, userId, io);
          }
        }
      } catch (err) {
        console.error('Error in room:join:', err);
      }
    });

    socket.on('room:leave', async (payload: unknown) => {
      const roomId = extractRoomId(payload);
      if (!roomId) return;
      if (socket.data.activeRoomId === roomId) {
        socket.data.activeRoomId = undefined;
      }
      await socket.leave(roomId);
    });

    socket.on('room:read', async (payload: unknown) => {
      try {
        const roomId = extractRoomId(payload);
        if (!roomId) return;
        const memberRole = await RoomsService.isUserMember(roomId, userId);
        if (memberRole) {
          await markRoomReadAndNotify(roomId, userId, io);
        }
      } catch (err) {
        console.error('Error in room:read:', err);
      }
    });

    registerChatHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', async () => {
      try {
        clearUserTypingAll(io, userId);

        const activeSockets = await io.fetchSockets();
        const hasOtherSockets = activeSockets.some(
          (s) => s.id !== socket.id && s.data.userId === userId
        );

        if (!hasOtherSockets) {
          const updated = await UsersService.updatePresence(userId, 'offline');
          io.emit('presence:changed', {
            userId,
            presence: updated.presence,
            lastSeenAt: updated.lastSeenAt,
          });
        }
      } catch (err) {
        console.error('Error handling socket disconnect:', err);
      }
    });
  });
}
