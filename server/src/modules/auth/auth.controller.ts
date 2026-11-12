import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import prisma from '../../config/database';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body, req.ip);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password, req.ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refresh(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body?.refreshToken;
      await AuthService.logout(refreshToken);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
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
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found', statusCode: 404 });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Account is deactivated', statusCode: 403 });
        return;
      }

      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}
