import { Router } from 'express';
import { MessagesController } from './messages.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { sendMessageSchema, updateMessageSchema } from './messages.validation';

// Mounted at /api/rooms/:roomId/messages
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/search', MessagesController.searchMessages);
router.get('/pinned', MessagesController.getPinnedMessages);
router.get('/', MessagesController.getMessages);
router.post('/', validate(sendMessageSchema), MessagesController.sendMessage);

// Mounted at /api/messages
export const messageDirectRoutes = Router();

messageDirectRoutes.use(authenticate);

messageDirectRoutes.patch('/:id', validate(updateMessageSchema), MessagesController.updateMessage);
messageDirectRoutes.delete('/:id', MessagesController.deleteMessage);
messageDirectRoutes.post('/:id/pin', MessagesController.togglePin);

export default router;
