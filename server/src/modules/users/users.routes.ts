import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', UsersController.getProfile);
router.patch('/me', UsersController.updateProfile);
router.get('/search', UsersController.searchUsers);
router.get('/:id', UsersController.getUser);

export default router;
