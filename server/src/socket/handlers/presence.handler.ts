import { Server, Socket } from 'socket.io';
import { UsersService } from '../../modules/users/users.service';

const ALLOWED_PRESENCE = ['online', 'away', 'dnd', 'offline'];

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on('presence:update', async (payload: unknown) => {
    try {
      const presence =
        typeof payload === 'string'
          ? payload
          : payload && typeof payload === 'object' && 'presence' in payload
            ? (payload as { presence?: unknown }).presence
            : null;

      if (typeof presence !== 'string' || !ALLOWED_PRESENCE.includes(presence)) {
        socket.emit('error', { message: 'Invalid presence status' });
        return;
      }

      const updated = await UsersService.updatePresence(userId, presence);
      io.emit('presence:changed', {
        userId,
        presence: updated.presence,
        lastSeenAt: updated.lastSeenAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update presence';
      socket.emit('error', { message });
    }
  });
}
