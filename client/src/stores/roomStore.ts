import { create } from 'zustand';
import { rooms as roomsApi } from '../services/api';
import type { Room, RoomMember } from '../types';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  members: RoomMember[];
  typingUsers: Record<string, string[]>;
  fetchRooms: () => Promise<void>;
  setCurrentRoom: (room: Room | null) => void;
  updateRoomInList: (room: Room) => void;
  createRoom: (data: { name: string; description?: string; type?: 'public' | 'private' }) => Promise<Room>;
  joinRoom: (id: string) => Promise<void>;
  leaveRoom: (id: string) => Promise<void>;
  fetchMembers: (roomId: string) => Promise<void>;
  setTypingUsers: (roomId: string, users: string[]) => void;
  updateUnreadCount: (roomId: string, count: number) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  members: [],
  typingUsers: {},

  fetchRooms: async () => {
    const { data } = await roomsApi.list();
    set({ rooms: data });
  },

  setCurrentRoom: (room) => {
    const prev = get().currentRoom;
    if (room && prev && room.id === prev.id) {
      set({ currentRoom: room });
    } else {
      set({ currentRoom: room, members: [] });
    }
  },

  updateRoomInList: (room) => {
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === room.id ? room : r)),
      currentRoom: state.currentRoom?.id === room.id ? room : state.currentRoom,
    }));
  },

  createRoom: async (roomData) => {
    const { data } = await roomsApi.create(roomData);
    set((state) => ({ rooms: [...state.rooms, data] }));
    return data;
  },

  joinRoom: async (id) => {
    await roomsApi.join(id);
    await get().fetchRooms();
  },

  leaveRoom: async (id) => {
    await roomsApi.leave(id);
    const state = get();
    set({
      rooms: state.rooms.filter((r) => r.id !== id),
      currentRoom: state.currentRoom?.id === id ? null : state.currentRoom,
    });
  },

  fetchMembers: async (roomId) => {
    const { data } = await roomsApi.getMembers(roomId);
    if (get().currentRoom?.id === roomId) {
      set({ members: data });
    }
  },

  setTypingUsers: (roomId, users) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [roomId]: users },
    }));
  },

  updateUnreadCount: (roomId, count) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, unreadCount: count } : r
      ),
    }));
  },
}));
