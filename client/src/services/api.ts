import axios from 'axios';
import type { User, Room, RoomMember, Message, AuditLog } from '../types';

const axiosInstance = axios.create({
  baseURL: '/api',
});

// Request interceptor: attach token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url: string = originalRequest?.url || '';

    // Do not intercept 401s on login/register/refresh endpoints
    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete axiosInstance.defaults.headers.common.Authorization;
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        window.dispatchEvent(
          new CustomEvent('auth:token-refreshed', { detail: data.accessToken })
        );
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete axiosInstance.defaults.headers.common.Authorization;
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const auth = {
  register: (data: { email: string; username: string; password: string; displayName: string }) =>
    axiosInstance.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data),

  login: (email: string, password: string) =>
    axiosInstance.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),

  refresh: (refreshToken: string) =>
    axiosInstance.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken }),

  logout: () =>
    axiosInstance.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),

  getMe: () =>
    axiosInstance.get<User>('/auth/me'),
};

// Rooms API
export const rooms = {
  list: () =>
    axiosInstance.get<Room[]>('/rooms'),

  create: (data: { name: string; description?: string; type?: 'public' | 'private' }) =>
    axiosInstance.post<Room>('/rooms', data),

  getById: (id: string) =>
    axiosInstance.get<Room>(`/rooms/${id}`),

  join: (id: string) =>
    axiosInstance.post(`/rooms/${id}/join`),

  leave: (id: string) =>
    axiosInstance.post(`/rooms/${id}/leave`),

  getMembers: (id: string) =>
    axiosInstance.get<RoomMember[]>(`/rooms/${id}/members`),

  addMember: (roomId: string, userId: string) =>
    axiosInstance.post<RoomMember>(`/rooms/${roomId}/members`, { userId }),

  removeMember: (roomId: string, userId: string) =>
    axiosInstance.delete(`/rooms/${roomId}/members/${userId}`),

  update: (id: string, data: { name?: string; description?: string; type?: 'public' | 'private' }) =>
    axiosInstance.patch<Room>(`/rooms/${id}`, data),

  archive: (id: string) =>
    axiosInstance.delete(`/rooms/${id}`),
};

// Messages API
export const messages = {
  getByRoom: (roomId: string, cursor?: string) =>
    axiosInstance.get<{ messages: Message[]; nextCursor?: string | null; hasMore: boolean }>(`/rooms/${roomId}/messages`, {
      params: cursor ? { cursor } : undefined,
    }),

  send: (roomId: string, content: string, replyToId?: string) =>
    axiosInstance.post<Message>(`/rooms/${roomId}/messages`, { content, replyToId }),

  update: (id: string, content: string) =>
    axiosInstance.patch<Message>(`/messages/${id}`, { content }),

  delete: (id: string) =>
    axiosInstance.delete(`/messages/${id}`),

  togglePin: (id: string) =>
    axiosInstance.post<Message>(`/messages/${id}/pin`),

  search: (roomId: string, query: string) =>
    axiosInstance.get<Message[]>(`/rooms/${roomId}/messages/search`, {
      params: { query },
    }),

  getPinned: (roomId: string) =>
    axiosInstance.get<Message[]>(`/rooms/${roomId}/messages/pinned`),
};

// Users API
export const users = {
  getMe: () =>
    axiosInstance.get<User>('/users/me'),

  getById: (id: string) =>
    axiosInstance.get<User>(`/users/${id}`),

  search: (query: string) =>
    axiosInstance.get<User[]>('/users/search', { params: { query } }),

  updateProfile: (data: Partial<Pick<User, 'displayName' | 'statusText' | 'avatar' | 'presence'>>) =>
    axiosInstance.patch<User>('/users/me', data),
};

// Admin API
export const admin = {
  getUsers: (page?: number, limit?: number, search?: string) =>
    axiosInstance.get<{ users: User[]; total: number }>('/admin/users', {
      params: { page, limit, search },
    }),

  updateUser: (id: string, data: { role?: string; isActive?: boolean }) =>
    axiosInstance.patch<User>(`/admin/users/${id}`, data),

  getStats: () =>
    axiosInstance.get<{
      totalUsers: number;
      onlineUsers: number;
      totalRooms: number;
      totalMessages: number;
      messagesToday: number;
    }>('/admin/stats'),

  getAuditLogs: (page?: number, limit?: number) =>
    axiosInstance.get<{ logs: AuditLog[]; total: number }>('/admin/audit', {
      params: { page, limit },
    }),
};

export const api = Object.assign(axiosInstance, {
  auth,
  rooms,
  messages,
  users,
  admin,
});

export default api;
