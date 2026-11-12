import { Request, Response, NextFunction } from 'express';
import { RoomsService } from './rooms.service';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../services/audit.service';
import { getIOOptional } from '../../socket';

export class RoomsController {
  static async listRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const rooms = await RoomsService.list(req.user!.userId);
      res.json(rooms);
    } catch (err) {
      next(err);
    }
  }

  static async listDMs(req: Request, res: Response, next: NextFunction) {
    try {
      const rooms = await RoomsService.listDMs(req.user!.userId);
      res.json(rooms);
    } catch (err) {
      next(err);
    }
  }

  static async getOrCreateDM(req: Request, res: Response, next: NextFunction) {
    try {
      const dmRoom = await RoomsService.getDMRoom(req.user!.userId, req.body.userId);
      res.json(dmRoom);
    } catch (err) {
      next(err);
    }
  }

  static async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await RoomsService.create(req.body, req.user!.userId);
      await createAuditLog(req.user!.userId, 'room.create', 'room', room.id, { name: room.name }, req.ip);
      res.status(201).json(room);
    } catch (err) {
      next(err);
    }
  }

  static async getRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await RoomsService.getById(req.params.id as string);
      if (room.type !== 'public' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        const memberRole = await RoomsService.isUserMember(room.id, req.user!.userId);
        if (!memberRole) {
          throw new AppError('Access denied to private room', 403);
        }
      }
      res.json(room);
    } catch (err) {
      next(err);
    }
  }

  static async updateRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      const memberRole = await RoomsService.isUserMember(roomId, req.user!.userId);
      if (memberRole !== 'admin' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        throw new AppError('Only room admins can update rooms', 403);
      }

      const room = await RoomsService.update(roomId, req.body);
      res.json(room);
    } catch (err) {
      next(err);
    }
  }

  static async archiveRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      const memberRole = await RoomsService.isUserMember(roomId, req.user!.userId);
      if (memberRole !== 'admin' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        throw new AppError('Only room admins can archive rooms', 403);
      }

      await RoomsService.archive(roomId);
      await createAuditLog(req.user!.userId, 'room.archive', 'room', roomId, {}, req.ip);
      const io = getIOOptional();
      if (io) {
        io.in(roomId).socketsLeave(roomId);
      }
      res.json({ message: 'Room archived successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async joinRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const member = await RoomsService.join(req.params.id as string, req.user!.userId);
      res.json(member);
    } catch (err) {
      next(err);
    }
  }

  static async leaveRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      await RoomsService.leave(roomId, req.user!.userId);
      const io = getIOOptional();
      if (io) {
        io.in(`user:${req.user!.userId}`).socketsLeave(roomId);
      }
      res.json({ message: 'Left room successfully' });
    } catch (err) {
      next(err);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      const room = await RoomsService.getById(roomId);
      if (room.type !== 'public' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        const memberRole = await RoomsService.isUserMember(roomId, req.user!.userId);
        if (!memberRole) {
          throw new AppError('Access denied to private room members', 403);
        }
      }
      const members = await RoomsService.getMembers(roomId);
      res.json(members);
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      const memberRole = await RoomsService.isUserMember(roomId, req.user!.userId);
      if (memberRole !== 'admin' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        throw new AppError('Only room admins can add members', 403);
      }

      const member = await RoomsService.addMember(roomId, req.body.userId);
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id as string;
      const memberRole = await RoomsService.isUserMember(roomId, req.user!.userId);
      if (memberRole !== 'admin' && req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        throw new AppError('Only room admins can remove members', 403);
      }

      const targetUserId = req.params.userId as string;
      await RoomsService.removeMember(roomId, targetUserId);
      const io = getIOOptional();
      if (io) {
        io.in(`user:${targetUserId}`).socketsLeave(roomId);
      }
      res.json({ message: 'Member removed successfully' });
    } catch (err) {
      next(err);
    }
  }
}
