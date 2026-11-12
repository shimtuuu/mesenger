import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UsersService } from './users.service';
import { AppError } from '../../middleware/errorHandler';
import { getIOOptional } from '../../socket';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  statusText: z.string().max(200).optional(),
  avatar: z.string().max(500).nullable().optional(),
  presence: z.enum(['online', 'away', 'dnd', 'offline']).optional(),
});

export class UsersController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getById(req.user!.userId);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UsersService.getById(req.params.id as string);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query =
        (typeof req.query.q === 'string' && req.query.q) ||
        (typeof req.query.query === 'string' && req.query.query) ||
        '';
      const limitParam = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const limit = Number.isNaN(limitParam) ? 20 : limitParam;

      const users = await UsersService.search(query, limit);
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400);
      }

      const updated = await UsersService.updateProfile(req.user!.userId, parsed.data);
      if (parsed.data.presence !== undefined) {
        const io = getIOOptional();
        if (io) {
          io.emit('presence:changed', {
            userId: updated.id,
            presence: updated.presence,
            lastSeenAt: updated.lastSeenAt,
          });
        }
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
}
