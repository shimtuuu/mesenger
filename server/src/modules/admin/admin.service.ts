import prisma from '../../config/database';
import { userPublicSelect } from '../users/users.service';

export class AdminService {
  static async getUsers(page: number = 1, limit: number = 20, search?: string) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where = search
      ? {
          OR: [
            { username: { contains: search } },
            { displayName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: userPublicSelect,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  static async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, onlineUsers, totalRooms, totalMessages, messagesToday] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { presence: { not: 'offline' }, isActive: true } }),
      prisma.room.count({ where: { isArchived: false } }),
      prisma.message.count({ where: { isDeleted: false } }),
      prisma.message.count({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfToday },
        },
      }),
    ]);

    return {
      totalUsers,
      onlineUsers,
      totalRooms,
      totalMessages,
      messagesToday,
    };
  }

  static async getAuditLogs(
    page: number = 1,
    limit: number = 20,
    action?: string,
    userId?: string
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const where = {
      ...(action && { action }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const parsedLogs = logs.map((log) => {
      let parsedMetadata: Record<string, unknown> = {};
      try {
        parsedMetadata = JSON.parse(log.metadata || '{}');
      } catch {
        parsedMetadata = {};
      }
      return {
        ...log,
        metadata: parsedMetadata,
      };
    });

    return {
      logs: parsedLogs,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
