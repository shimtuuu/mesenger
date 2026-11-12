import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RoomList } from '../rooms/RoomList';
import { UserAvatar } from '../users/UserAvatar';
import { PresenceIndicator, type PresenceStatus } from '../users/PresenceIndicator';
import type { Room } from '../../types';

interface SidebarProps {
  onSelectRoom: (room: Room) => void;
  onPresenceChange?: (presence: PresenceStatus) => boolean;
}

const PRESENCE_OPTIONS: { value: PresenceStatus; label: string }[] = [
  { value: 'online', label: 'В сети' },
  { value: 'away', label: 'Отошел' },
  { value: 'dnd', label: 'Не беспокоить' },
  { value: 'offline', label: 'Невидимый' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  onSelectRoom,
  onPresenceChange,
}) => {
  const { user, logout, updateProfile, setUser } = useAuthStore();
  const {
    sidebarOpen,
    toggleSidebar,
    toggleCreateRoom,
    showAdminPanel,
    toggleAdminPanel,
  } = useUIStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [statusTextInput, setStatusTextInput] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handlePresenceSelect = async (presence: PresenceStatus) => {
    setShowStatusMenu(false);
    if (!user) return;
    const prevPresence = user.presence;
    setUser({ ...user, presence });
    const sentViaSocket = onPresenceChange?.(presence);
    if (!sentViaSocket) {
      try {
        await updateProfile({ presence });
      } catch {
        setUser({ ...user, presence: prevPresence });
      }
    }
  };

  const openProfileSettings = () => {
    if (!user) return;
    setDisplayNameInput(user.displayName);
    setStatusTextInput(user.statusText || '');
    setProfileError('');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    setProfileError('');
    setSavingProfile(true);
    try {
      await updateProfile({
        displayName: displayNameInput.trim(),
        statusText: statusTextInput.trim(),
      });
      setShowProfileModal(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setProfileError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          'Не удалось сохранить настройки профиля'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const currentPresenceLabel =
    PRESENCE_OPTIONS.find((o) => o.value === user?.presence)?.label || 'В сети';

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 w-[280px] flex-shrink-0 bg-sidebar text-sidebar-text flex flex-col h-full transition-transform duration-200 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base truncate">
              Corp Messenger
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <UserAvatar
                user={user}
                size="sm"
                showStatus
                statusRingClassName="ring-sidebar"
              />
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded-md text-sidebar-muted hover:text-white md:hidden"
              title="Закрыть меню"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="p-3 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-sidebar-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск каналов..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-sidebar-hover text-sidebar-text placeholder-sidebar-muted border border-white/5 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable channels & DMs */}
        <div className="flex-1 overflow-y-auto px-2 space-y-5">
          {/* Channels section */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                Каналы
              </span>
              <button
                type="button"
                onClick={toggleCreateRoom}
                className="p-1 rounded hover:bg-sidebar-hover text-sidebar-muted hover:text-white transition-colors"
                title="Создать канал"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <RoomList
              searchQuery={searchQuery}
              onSelectRoom={(room) => {
                if (showAdminPanel) {
                  toggleAdminPanel();
                }
                onSelectRoom(room);
              }}
            />
          </div>

          {/* Direct messages placeholder */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
                Прямые сообщения
              </span>
            </div>
            <p className="px-3 py-1.5 text-xs text-sidebar-muted/80 italic">
              Личные чаты скоро появятся
            </p>
          </div>

          {/* Admin Panel toggle */}
          {isAdmin && (
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={toggleAdminPanel}
                className={cn(
                  'w-full px-3 py-2 rounded-md flex items-center gap-2 text-sm transition-colors duration-150',
                  showAdminPanel
                    ? 'bg-sidebar-active text-white font-medium'
                    : 'text-sidebar-text/80 hover:bg-sidebar-hover hover:text-white'
                )}
              >
                <Shield className="w-4 h-4 text-primary-400" />
                <span>Панель администратора</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom user profile area */}
        {user && (
          <div className="relative p-3 border-t border-white/10 bg-black/15 flex-shrink-0">
            {showStatusMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#252538] border border-white/10 rounded-lg shadow-xl py-1 z-50">
                {PRESENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePresenceSelect(opt.value)}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-sidebar-hover transition-colors',
                      user.presence === opt.value
                        ? 'text-white font-medium'
                        : 'text-sidebar-text/80'
                    )}
                  >
                    <PresenceIndicator presence={opt.value} size="sm" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowStatusMenu((prev) => !prev)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-lg p-1 hover:bg-sidebar-hover transition-colors"
              >
                <UserAvatar
                  user={user}
                  size="sm"
                  showStatus
                  statusRingClassName="ring-[#191927]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {user.displayName}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-sidebar-muted truncate">
                    <span className="truncate">
                      {user.statusText || currentPresenceLabel}
                    </span>
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={openProfileSettings}
                  className="p-1.5 rounded-lg text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors"
                  title="Настройки профиля"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-sidebar-muted hover:text-red-400 hover:bg-sidebar-hover transition-colors"
                  title="Выйти"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Profile Settings Modal */}
      {showProfileModal && user && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold">Настройки профиля</h3>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
              {profileError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {profileError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Отображаемое имя
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст статуса
                </label>
                <input
                  type="text"
                  value={statusTextInput}
                  onChange={(e) => setStatusTextInput(e.target.value)}
                  placeholder="На встрече, в отпуске..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
                >
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
