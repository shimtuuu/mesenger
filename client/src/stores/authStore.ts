import { create } from 'zustand';
import api, { auth, users } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<Pick<User, 'displayName' | 'avatar' | 'statusText' | 'presence'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  login: async (email, password) => {
    const { data } = await auth.login(email, password);
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
    });
  },

  register: async (registerData) => {
    const { data } = await auth.register(registerData);
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({
      user: data.user,
      token: data.accessToken,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await auth.logout();
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common.Authorization;
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const { data } = await auth.getMe();
      set({ user: data, isAuthenticated: true, isLoading: false, token: localStorage.getItem('token') });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete api.defaults.headers.common.Authorization;
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await users.updateProfile(profileData);
    set({ user: data });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:token-refreshed', (event) => {
    const newToken = (event as CustomEvent<string>).detail;
    if (newToken) {
      useAuthStore.setState({ token: newToken });
    }
  });

  window.addEventListener('auth:logout', () => {
    delete api.defaults.headers.common.Authorization;
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });
}
