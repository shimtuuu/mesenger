import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  X,
  Search,
  Loader2,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMessageTime } from '../../utils/format';
import { admin as adminApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { UserAvatar } from '../users/UserAvatar';
import type { User, AuditLog } from '../../types';

type Tab = 'users' | 'stats' | 'audit';

interface StatsData {
  totalUsers: number;
  onlineUsers: number;
  totalRooms: number;
  totalMessages: number;
  messagesToday: number;
}

const ROLE_OPTIONS: { value: User['role']; label: string }[] = [
  { value: 'owner', label: 'Владелец' },
  { value: 'admin', label: 'Администратор' },
  { value: 'moderator', label: 'Модератор' },
  { value: 'member', label: 'Участник' },
  { value: 'guest', label: 'Гость' },
];

export const AdminPanel: React.FC = () => {
  const currentUser = useAuthStore((s) => s.user);
  const toggleAdminPanel = useUIStore((s) => s.toggleAdminPanel);

  const [activeTab, setActiveTab] = useState<Tab>('users');

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [error, setError] = useState('');
  const PAGE_LIMIT = 15;

  const isAuthorized =
    currentUser?.role === 'admin' || currentUser?.role === 'owner';

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError('');
    try {
      const { data } = await adminApi.getUsers(
        usersPage,
        PAGE_LIMIT,
        usersSearch.trim() || undefined
      );
      setUsersList(data.users);
      setUsersTotal(data.total);
    } catch {
      setError('Не удалось загрузить список пользователей');
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, usersSearch]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setError('');
    try {
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch {
      setError('Не удалось загрузить статистику');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    setError('');
    try {
      const { data } = await adminApi.getAuditLogs(auditPage, PAGE_LIMIT);
      setAuditLogs(data.logs);
      setAuditTotal(data.total);
    } catch {
      setError('Не удалось загрузить журнал аудита');
    } finally {
      setLoadingAudit(false);
    }
  }, [auditPage]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'audit') {
      loadAudit();
    }
  }, [activeTab, isAuthorized, loadUsers, loadStats, loadAudit]);

  if (!isAuthorized) {
    return null;
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const { data } = await adminApi.updateUser(userId, { role });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u))
      );
    } catch {
      setError('Не удалось изменить роль пользователя');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const { data } = await adminApi.updateUser(user.id, {
        isActive: !user.isActive,
      });
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: data.isActive } : u
        )
      );
    } catch {
      setError('Не удалось изменить статус пользователя');
    }
  };

  const usersTotalPages = Math.max(1, Math.ceil(usersTotal / PAGE_LIMIT));
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / PAGE_LIMIT));

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 min-w-0">
      {/* Header */}
      <div className="h-14 px-6 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900">
            Панель администратора
          </h2>
        </div>
        <button
          type="button"
          onClick={toggleAdminPanel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Закрыть</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 bg-white border-b border-gray-200 flex items-center gap-6 flex-shrink-0">
        {(
          [
            { id: 'users', label: 'Пользователи' },
            { id: 'stats', label: 'Статистика' },
            { id: 'audit', label: 'Аудит' },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  placeholder="Поиск пользователей..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <span className="text-xs text-gray-500">
                Всего: {usersTotal}
              </span>
            </div>

            {loadingUsers ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Имя</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Роль</th>
                      <th className="px-4 py-3">Статус</th>
                      <th className="px-4 py-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar user={u} size="sm" showStatus />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {u.displayName}
                              </div>
                              <div className="text-xs text-gray-400">
                                @{u.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            disabled={u.id === currentUser?.id}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value)
                            }
                            className="px-2.5 py-1 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              u.isActive
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            )}
                          >
                            {u.isActive ? 'Активен' : 'Заблокирован'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={u.id === currentUser?.id}
                            onClick={() => handleToggleActive(u)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                              u.isActive
                                ? 'text-red-600 hover:bg-red-50 border border-red-200'
                                : 'text-green-600 hover:bg-green-50 border border-green-200'
                            )}
                          >
                            {u.isActive ? 'Отключить' : 'Активировать'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          Пользователи не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Страница {usersPage} из {usersTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={usersPage <= 1}
                  onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={usersPage >= usersTotalPages}
                  onClick={() =>
                    setUsersPage((p) => Math.min(usersTotalPages, p + 1))
                  }
                  className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Вперёд
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div>
            {loadingStats || !stats ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Всего пользователей</span>
                    <Users className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Онлайн</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.onlineUsers}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Каналов</span>
                    <Hash className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.totalRooms}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Сообщений</span>
                    <MessageSquare className="w-4 h-4 text-primary-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.totalMessages}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Сообщений сегодня</span>
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stats.messagesToday}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingAudit ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Время</th>
                      <th className="px-4 py-3">Пользователь</th>
                      <th className="px-4 py-3">Действие</th>
                      <th className="px-4 py-3">Объект</th>
                      <th className="px-4 py-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatMessageTime(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {log.user?.displayName || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {log.entityType}:{' '}
                          <span className="font-mono text-gray-500">
                            {log.entityId}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-400 text-sm"
                        >
                          Записи аудита отсутствуют
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <span>
                Страница {auditPage} из {auditTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={auditPage >= auditTotalPages}
                  onClick={() =>
                    setAuditPage((p) => Math.min(auditTotalPages, p + 1))
                  }
                  className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Вперёд
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
