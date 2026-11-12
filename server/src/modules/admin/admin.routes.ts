import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/auth';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    res.status(403).json({ error: 'Admin access required', statusCode: 403 });
    return;
  }
  next();
}

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/users', AdminController.getUsers);
router.patch('/users/:id', AdminController.updateUser);
router.get('/stats', AdminController.getStats);
router.get('/audit', AdminController.getAuditLogs);

export default router;
