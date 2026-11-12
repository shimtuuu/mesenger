import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export const userPublicSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatar: true,
  statusText: true,
  presence: true,
  role: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
};

export class UsersService {
  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  static async search(query: string, limit: number = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    return prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { username: { contains: query } },
          { displayName: { contains: query } },
        ],
      },
      select: userPublicSelect,
      take: safeLimit,
      orderBy: { displayName: 'asc' },
    });
  }

  static async updateProfile(
    userId: string,
    data: { displayName?: string; statusText?: string; avatar?: string | null; presence?: string }
  ) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (data.presence !== undefined && !['online', 'away', 'dnd', 'offline'].includes(data.presence)) {
      throw new AppError('Invalid presence status', 400);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.statusText !== undefined && { statusText: data.statusText }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.presence !== undefined && { presence: data.presence, lastSeenAt: new Date() }),
      },
      select: userPublicSelect,
    });
  }

  static async list(page: number = 1, limit: number = 20) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: userPublicSelect,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  static async setActive(userId: string, isActive: boolean) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: userPublicSelect,
    });
  }

  static async updateRole(userId: string, role: string) {
    const allowedRoles = ['owner', 'admin', 'moderator', 'member', 'guest'];
    if (!allowedRoles.includes(role)) {
      throw new AppError('Invalid role', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: userPublicSelect,
    });
  }

  static async updatePresence(userId: string, presence: string) {
    const allowedPresence = ['online', 'away', 'dnd', 'offline'];
    if (!allowedPresence.includes(presence)) {
      throw new AppError('Invalid presence status', 400);
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        presence,
        lastSeenAt: new Date(),
      },
      select: userPublicSelect,
    });
  }
}
