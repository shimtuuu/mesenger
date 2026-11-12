import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { CreateRoomInput, UpdateRoomInput } from './rooms.validation';

export class RoomsService {
  static async list(userId: string) {
    const rooms = await prisma.room.findMany({
      where: {
        isArchived: false,
        type: { in: ['public', 'private'] },
        OR: [
          { type: 'public' },
          { members: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { userId },
          select: { lastReadAt: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      rooms.map(async ({ members, ...room }) => {
        const membership = members[0];
        const unreadCount = membership
          ? await prisma.message.count({
              where: {
                roomId: room.id,
                isDeleted: false,
                userId: { not: userId },
                createdAt: { gt: membership.lastReadAt },
              },
            })
          : 0;

        return {
          ...room,
          memberCount: room._count.members,
          unreadCount,
        };
      })
    );
  }

  static async listDMs(userId: string) {
    const rooms = await prisma.room.findMany({
      where: {
        isArchived: false,
        type: 'dm',
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                presence: true,
                statusText: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return Promise.all(
      rooms.map(async (room) => {
        const membership = room.members.find((m) => m.userId === userId);
        const unreadCount = membership
          ? await prisma.message.count({
              where: {
                roomId: room.id,
                isDeleted: false,
                userId: { not: userId },
                createdAt: { gt: membership.lastReadAt },
              },
            })
          : 0;

        return {
          ...room,
          memberCount: room._count.members,
          unreadCount,
        };
      })
    );
  }

  static async create(data: CreateRoomInput, userId: string) {
    const existing = await prisma.room.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError('Room name already exists', 400);
    }

    const room = await prisma.room.create({
      data: {
        name: data.name,
        description: data.description || '',
        type: data.type,
        createdById: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return {
      ...room,
      memberCount: room._count.members,
      unreadCount: 0,
    };
  }

  static async getById(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: { select: { members: true } },
      },
    });

    if (!room) {
      throw new AppError('Room not found', 404);
    }

    return {
      ...room,
      memberCount: room._count.members,
    };
  }

  static async update(roomId: string, data: UpdateRoomInput) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.isArchived) {
      throw new AppError('Cannot update an archived room', 400);
    }

    if (data.name !== undefined && data.name !== room.name) {
      const existing = await prisma.room.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== roomId) {
        throw new AppError('Room name already exists', 400);
      }
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type !== undefined && { type: data.type }),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return {
      ...updated,
      memberCount: updated._count.members,
    };
  }

  static async archive(roomId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    return prisma.room.update({
      where: { id: roomId },
      data: { isArchived: true },
    });
  }

  static async join(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.isArchived) {
      throw new AppError('Cannot join an archived room', 400);
    }

    if (room.type !== 'public') {
      throw new AppError('Cannot join a non-public room', 403);
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (existingMember) {
      throw new AppError('Already a member of this room', 400);
    }

    return prisma.roomMember.create({
      data: { userId, roomId, role: 'member' },
    });
  }

  static async leave(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.type === 'dm') {
      throw new AppError('Cannot leave a direct message room', 400);
    }

    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (!member) {
      throw new AppError('Not a member of this room', 400);
    }

    await prisma.roomMember.delete({
      where: { userId_roomId: { userId, roomId } },
    });
  }

  static async getMembers(roomId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    return prisma.roomMember.findMany({
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            presence: true,
            statusText: true,
            role: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  static async addMember(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.isArchived) {
      throw new AppError('Cannot add members to an archived room', 400);
    }

    if (room.type === 'dm') {
      throw new AppError('Cannot add members to a direct message room', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError('User not found', 404);
    }

    const existingMember = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (existingMember) {
      throw new AppError('User is already a member', 400);
    }

    return prisma.roomMember.create({
      data: { userId, roomId, role: 'member' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            presence: true,
            statusText: true,
            role: true,
            lastSeenAt: true,
          },
        },
      },
    });
  }

  static async removeMember(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new AppError('Room not found', 404);
    }

    if (room.type === 'dm') {
      throw new AppError('Cannot remove members from a direct message room', 400);
    }

    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    if (!member) {
      throw new AppError('User is not a member', 400);
    }

    await prisma.roomMember.delete({
      where: { userId_roomId: { userId, roomId } },
    });
  }

  static async isUserMember(roomId: string, userId: string): Promise<string | null> {
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });

    return member ? member.role : null;
  }

  static async getDMRoom(userId1: string, userId2: string) {
    if (userId1 === userId2) {
      throw new AppError('Cannot create a direct message room with yourself', 400);
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId2 } });
    if (!targetUser || !targetUser.isActive) {
      throw new AppError('Target user not found', 404);
    }

    // Find existing DM room where both users are members
    const existingRoom = await prisma.room.findFirst({
      where: {
        type: 'dm',
        AND: [
          { members: { some: { userId: userId1 } } },
          { members: { some: { userId: userId2 } } },
        ],
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                presence: true,
                statusText: true,
              },
            },
          },
        },
      },
    });

    if (existingRoom) {
      return {
        ...existingRoom,
        memberCount: existingRoom._count.members,
      };
    }

    const [firstId, secondId] = [userId1, userId2].sort();

    // Create new DM room
    const dmRoom = await prisma.room.create({
      data: {
        name: `dm-${firstId}-${secondId}`,
        type: 'dm',
        createdById: userId1,
        members: {
          create: [
            { userId: userId1, role: 'member' },
            { userId: userId2, role: 'member' },
          ],
        },
      },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                presence: true,
                statusText: true,
              },
            },
          },
        },
      },
    });

    return {
      ...dmRoom,
      memberCount: dmRoom._count.members,
    };
  }
}
