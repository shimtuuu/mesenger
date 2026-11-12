import { useEffect, useCallback, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { useAuthStore } from '../stores/authStore';
import { useMessageStore } from '../stores/messageStore';
import { useRoomStore } from '../stores/roomStore';
import type { Message } from '../types';

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = connectSocket(token);

    socket.on('connect', () => {
      const activeRoom = useRoomStore.getState().currentRoom;
      if (activeRoom) {
        socket.emit('room:join', { roomId: activeRoom.id });
      }
    });

    socket.on('message:new', (message: Message) => {
      const room = useRoomStore.getState().currentRoom;
      const currentUserId = useAuthStore.getState().user?.id;
      if (room && message.roomId === room.id) {
        useMessageStore.getState().addMessage(message);
      } else if (message.userId !== currentUserId) {
        const targetRoom = useRoomStore
          .getState()
          .rooms.find((r) => r.id === message.roomId);
        if (targetRoom) {
          useRoomStore
            .getState()
            .updateUnreadCount(
              message.roomId,
              (targetRoom.unreadCount ?? 0) + 1
            );
        }
      }
    });

    socket.on('message:updated', (message: Message) => {
      useMessageStore.getState().updateMessage(message);
    });

    socket.on(
      'message:deleted',
      (payload: { messageId?: string; id?: string }) => {
        const targetId = payload.messageId || payload.id;
        if (targetId) {
          useMessageStore.getState().removeMessage(targetId);
        }
      }
    );

    socket.on(
      'typing:update',
      ({ roomId, users }: { roomId: string; users: string[] }) => {
        useRoomStore.getState().setTypingUsers(roomId, users);
      }
    );

    socket.on(
      'presence:changed',
      ({ userId, presence }: { userId: string; presence: string }) => {
        const normalizedPresence = presence as
          | 'online'
          | 'away'
          | 'dnd'
          | 'offline';
        const members = useRoomStore.getState().members;
        const updatedMembers = members.map((m) =>
          m.user.id === userId
            ? { ...m, user: { ...m.user, presence: normalizedPresence } }
            : m
        );
        useRoomStore.setState({ members: updatedMembers });

        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.id === userId) {
          useAuthStore
            .getState()
            .setUser({ ...currentUser, presence: normalizedPresence });
        }
      }
    );

    socket.on(
      'unread:update',
      ({ roomId, count }: { roomId: string; count: number }) => {
        if (useRoomStore.getState().currentRoom?.id === roomId) {
          useRoomStore.getState().updateUnreadCount(roomId, 0);
          return;
        }
        useRoomStore.getState().updateUnreadCount(roomId, count);
      }
    );

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  const sendMessage = useCallback(
    (roomId: string, content: string, replyToId?: string): Promise<boolean> => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        return Promise.resolve(false);
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Превышено время ожидания отправки сообщения'));
        }, 10000);

        socket.emit(
          'message:send',
          { roomId, content, replyToId },
          (ack?: { ok: boolean; data?: Message; error?: string }) => {
            clearTimeout(timeout);
            if (!ack || ack.ok) {
              if (ack?.data && useRoomStore.getState().currentRoom?.id === roomId) {
                useMessageStore.getState().addMessage(ack.data);
              }
              resolve(true);
            } else {
              reject(new Error(ack.error || 'Не удалось отправить сообщение'));
            }
          }
        );
      });
    },
    []
  );

  const startTyping = useCallback((roomId: string) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:start', { roomId });
    }
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    lastTypingSentRef.current = 0;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typing:stop', { roomId });
    }
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('room:join', { roomId });
    }
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    const socket = getSocket();
    if (socket) {
      socket.emit('room:leave', { roomId });
    }
  }, []);

  const updatePresence = useCallback(
    (presence: 'online' | 'away' | 'dnd' | 'offline'): boolean => {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('presence:update', { presence });
        return true;
      }
      return false;
    },
    []
  );

  const handleTyping = useCallback(
    (roomId: string) => {
      const now = Date.now();
      if (now - lastTypingSentRef.current >= 2000) {
        lastTypingSentRef.current = now;
        startTyping(roomId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(roomId);
      }, 3000);
    },
    [startTyping, stopTyping]
  );

  return {
    sendMessage,
    startTyping,
    stopTyping,
    joinRoom,
    leaveRoom,
    updatePresence,
    handleTyping,
  };
}
