import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  showCreateRoom: boolean;
  showMembersList: boolean;
  showAdminPanel: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleCreateRoom: () => void;
  toggleMembersList: () => void;
  toggleAdminPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  showCreateRoom: false,
  showMembersList: false,
  showAdminPanel: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setTheme: (theme) => set({ theme }),
  toggleCreateRoom: () => set((s) => ({ showCreateRoom: !s.showCreateRoom })),
  toggleMembersList: () => set((s) => ({ showMembersList: !s.showMembersList })),
  toggleAdminPanel: () => set((s) => ({ showAdminPanel: !s.showAdminPanel })),
}));
