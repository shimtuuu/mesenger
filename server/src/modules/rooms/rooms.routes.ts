import { Router } from 'express';
import { RoomsController } from './rooms.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { createRoomSchema, updateRoomSchema, inviteMemberSchema, dmRoomSchema } from './rooms.validation';
import messagesRoutes from '../messages/messages.routes';

const router = Router();

router.use(authenticate);

router.get('/', RoomsController.listRooms);
router.post('/', validate(createRoomSchema), RoomsController.createRoom);
router.get('/dm', RoomsController.listDMs);
router.post('/dm', validate(dmRoomSchema), RoomsController.getOrCreateDM);
router.get('/:id', RoomsController.getRoom);
router.patch('/:id', validate(updateRoomSchema), RoomsController.updateRoom);
router.delete('/:id', RoomsController.archiveRoom);
router.post('/:id/join', RoomsController.joinRoom);
router.post('/:id/leave', RoomsController.leaveRoom);
router.get('/:id/members', RoomsController.getMembers);
router.post('/:id/members', validate(inviteMemberSchema), RoomsController.addMember);
router.delete('/:id/members/:userId', RoomsController.removeMember);
router.use('/:roomId/messages', messagesRoutes);

export default router;
