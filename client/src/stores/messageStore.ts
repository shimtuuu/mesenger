import { create } from 'zustand';
import { messages as messagesApi } from '../services/api';
import { useRoomStore } from './roomStore';
import type { Message } from '../types';

interface MessageState {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  replyTo: Message | null;
  fetchMessages: (roomId: string, cursor?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  sendMessage: (roomId: string, content: string, replyToId?: string) => Promise<void>;
  editMessage: (id: string, content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setReplyTo: (message: Message | null) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  clearMessages: () => void;
}

let activeFetchSeq = 0;

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  nextCursor: null,
  hasMore: true,
  isLoading: false,
  replyTo: null,

  fetchMessages: async (roomId, cursor) => {
    const requestSeq = ++activeFetchSeq;
    set({ isLoading: true });
    try {
      const { data } = await messagesApi.getByRoom(roomId, cursor);
      if (
        requestSeq !== activeFetchSeq ||
        useRoomStore.getState().currentRoom?.id !== roomId
      ) {
        return;
      }

      const newMessages: Message[] = Array.isArray(data) ? data : (data.messages ?? []);
      const hasMore = Array.isArray(data)
        ? newMessages.length >= 50
        : (data.hasMore ?? newMessages.length >= 50);
      const nextCursor = Array.isArray(data) ? null : (data.nextCursor ?? null);

      if (cursor) {
        set((state) => {
          const existingIds = new Set(state.messages.map((m) => m.id));
          const uniqueOlder = newMessages.filter((m) => !existingIds.has(m.id));
          return {
            messages: [...state.messages, ...uniqueOlder],
            nextCursor,
            hasMore,
            isLoading: false,
          };
        });
      } else {
        set({ messages: newMessages, nextCursor, hasMore, isLoading: false });
      }
    } catch (err) {
      if (
        requestSeq === activeFetchSeq &&
        useRoomStore.getState().currentRoom?.id === roomId
      ) {
        set({ isLoading: false });
      }
      throw err;
    }
  },

  addMessage: (message) => {
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [message, ...state.messages] };
    });
  },

  sendMessage: async (roomId, content, replyToId) => {
    const { data } = await messagesApi.send(roomId, content, replyToId);
    if (useRoomStore.getState().currentRoom?.id === roomId) {
      get().addMessage(data);
    }
  },

  editMessage: async (id, content) => {
    const { data } = await messagesApi.update(id, content);
    get().updateMessage(data);
  },

  deleteMessage: async (id) => {
    await messagesApi.delete(id);
    get().removeMessage(id);
  },

  togglePin: async (id) => {
    const { data } = await messagesApi.togglePin(id);
    get().updateMessage(data);
  },

  setReplyTo: (message) => set({ replyTo: message }),

  updateMessage: (message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    }));
  },

  removeMessage: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? { ...m, isDeleted: true, content: 'Сообщение удалено' }
          : m
      ),
    }));
  },

  clearMessages: () => {
    activeFetchSeq++;
    set({ messages: [], nextCursor: null, hasMore: true, isLoading: false, replyTo: null });
  },
}));
