import { Server as SocketIOServer } from 'socket.io';
import prisma from '../config/database';

export async function markRoomReadAndNotify(
  roomId: string,
  userId: string,
  io?: SocketIOServer | null
): Promise<void> {
  await prisma.roomMember.updateMany({
    where: { roomId, userId },
    data: { lastReadAt: new Date() },
  });

  if (io) {
    io.to(`user:${userId}`).emit('unread:update', { roomId, count: 0 });
  }
}

export async function notifyRoomUnread(
  io: SocketIOServer,
  roomId: string,
  senderUserId: string
): Promise<void> {
  const socketsInRoom = await io.in(roomId).fetchSockets();
  const activeViewerIds = socketsInRoom
    .filter((s) => s.data.activeRoomId === roomId)
    .map((s) => s.data.userId as string)
    .filter(Boolean);

  const readUserIds = Array.from(new Set([senderUserId, ...activeViewerIds]));

  await prisma.roomMember.updateMany({
    where: { roomId, userId: { in: readUserIds } },
    data: { lastReadAt: new Date() },
  });

  const unreadMembers = await prisma.roomMember.findMany({
    where: { roomId, userId: { notIn: readUserIds } },
    select: { userId: true, lastReadAt: true },
  });

  await Promise.all(
    unreadMembers.map(async (member) => {
      const count = await prisma.message.count({
        where: {
          roomId,
          isDeleted: false,
          userId: { not: member.userId },
          createdAt: { gt: member.lastReadAt },
        },
      });
      io.to(`user:${member.userId}`).emit('unread:update', { roomId, count });
    })
  );
}
