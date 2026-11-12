import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../services/audit.service';
import { getIOOptional } from '../../socket';

const updateUserSchema = z.object({
  role: z.enum(['owner', 'admin', 'moderator', 'member', 'guest']).optional(),
  isActive: z.boolean().optional(),
});

export class AdminController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const pageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
      const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const page = Number.isNaN(pageParam) ? 1 : pageParam;
      const limit = Number.isNaN(limitParam) ? 20 : limitParam;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const result = await AdminService.getUsers(page, limit, search);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400);
      }

      const targetUserId = req.params.id as string;
      const { role, isActive } = parsed.data;

      if (role === undefined && isActive === undefined) {
        throw new AppError('At least one of role or isActive must be provided', 400);
      }

      const targetUser = await UsersService.getById(targetUserId);

      if (targetUserId === req.user!.userId) {
        if (isActive === false) {
          throw new AppError('Cannot deactivate your own account', 400);
        }
        if (role !== undefined && role !== req.user!.role) {
          throw new AppError('Cannot change your own role', 400);
        }
      }

      if (req.user!.role !== 'owner') {
        if (targetUser.role === 'owner') {
          throw new AppError('Only an owner can modify an owner account', 403);
        }
        if (role === 'owner') {
          throw new AppError('Only an owner can assign the owner role', 403);
        }
      }

      let updatedUser = targetUser;
      if (role !== undefined) {
        updatedUser = await UsersService.updateRole(targetUserId, role);
      }
      if (isActive !== undefined) {
        updatedUser = await UsersService.setActive(targetUserId, isActive);
        if (!isActive) {
          await prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });
          updatedUser = await UsersService.updatePresence(targetUserId, 'offline');

          const io = getIOOptional();
          if (io) {
            const sockets = await io.in(`user:${targetUserId}`).fetchSockets();
            for (const s of sockets) {
              s.disconnect(true);
            }
            io.emit('presence:changed', {
              userId: targetUserId,
              presence: 'offline',
              lastSeenAt: new Date(),
            });
          }
        }
      }

      await createAuditLog(
        req.user!.userId,
        'admin.user.update',
        'user',
        targetUserId,
        { role, isActive },
        req.ip
      );

      res.json(updatedUser);
    } catch (err) {
      next(err);
    }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const pageParam = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
      const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const page = Number.isNaN(pageParam) ? 1 : pageParam;
      const limit = Number.isNaN(limitParam) ? 20 : limitParam;
      const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
      const userId = typeof req.query.userId === 'string' && req.query.userId ? req.query.userId : undefined;

      const result = await AdminService.getAuditLogs(page, limit, action, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
