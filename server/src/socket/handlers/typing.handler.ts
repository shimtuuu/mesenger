import { Server, Socket } from 'socket.io';
import prisma from '../../config/database';
import { RoomsService } from '../../modules/rooms/rooms.service';

// roomId -> Set<userId>
const typingUsersMap = new Map<string, Set<string>>();
// `${roomId}:${userId}` -> auto-clear timer
const typingTimersMap = new Map<string, NodeJS.Timeout>();

const TYPING_TIMEOUT_MS = 5000;

function emitTypingUpdate(io: Server, roomId: string): void {
  const users = Array.from(typingUsersMap.get(roomId) || []);
  io.to(roomId).emit('typing:update', {
    roomId,
    users,
    userIds: users,
  });
}

export function clearUserTypingInRoom(io: Server, roomId: string, userId: string): void {
  const timerKey = `${roomId}:${userId}`;
  const existingTimer = typingTimersMap.get(timerKey);
  if (existingTimer) {
    clearTimeout(existingTimer);
    typingTimersMap.delete(timerKey);
  }

  const roomSet = typingUsersMap.get(roomId);
  if (roomSet && roomSet.has(userId)) {
    roomSet.delete(userId);
    if (roomSet.size === 0) {
      typingUsersMap.delete(roomId);
    }
    emitTypingUpdate(io, roomId);
  }
}

export function clearUserTypingAll(io: Server, userId: string): void {
  for (const [roomId, roomSet] of typingUsersMap.entries()) {
    if (roomSet.has(userId)) {
      clearUserTypingInRoom(io, roomId, userId);
    }
  }
}

function extractRoomId(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object' && 'roomId' in payload) {
    const roomId = (payload as { roomId?: unknown }).roomId;
    return typeof roomId === 'string' ? roomId : null;
  }
  return null;
}

export function registerTypingHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;
  const userRole = (socket.data.role as string) || 'member';

  socket.on('typing:start', async (payload: unknown) => {
    try {
      const roomId = extractRoomId(payload);
      if (!roomId) return;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
        select: { id: true, isArchived: true },
      });
      if (!room || room.isArchived) return;

      const memberRole = await RoomsService.isUserMember(roomId, userId);
      if (!memberRole && userRole !== 'admin' && userRole !== 'owner') {
        return;
      }

      if (!socket.connected) return;

      let roomSet = typingUsersMap.get(roomId);
      if (!roomSet) {
        roomSet = new Set<string>();
        typingUsersMap.set(roomId, roomSet);
      }

      const wasTyping = roomSet.has(userId);
      roomSet.add(userId);

      const timerKey = `${roomId}:${userId}`;
      const existingTimer = typingTimersMap.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        clearUserTypingInRoom(io, roomId, userId);
      }, TYPING_TIMEOUT_MS);
      typingTimersMap.set(timerKey, timer);

      if (!wasTyping) {
        emitTypingUpdate(io, roomId);
      }
    } catch (err) {
      console.error('Error in typing:start:', err);
    }
  });

  socket.on('typing:stop', (payload: unknown) => {
    const roomId = extractRoomId(payload);
    if (!roomId) return;

    clearUserTypingInRoom(io, roomId, userId);
  });
}
