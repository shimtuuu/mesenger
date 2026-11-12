import React, { useState, useEffect } from 'react';
import {
  Hash,
  Lock,
  Users,
  Search,
  Pin,
  Settings,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRoomStore } from '../../stores/roomStore';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { messages as messagesApi, rooms as roomsApi } from '../../services/api';
import { RoomSearch } from '../rooms/RoomSearch';
import { UserAvatar } from '../users/UserAvatar';
import { formatMessageTime } from '../../utils/format';
import type { Message } from '../../types';

interface HeaderProps {
  onScrollToMessage?: (messageId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onScrollToMessage }) => {
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const members = useRoomStore((s) => s.members);
  const setCurrentRoom = useRoomStore((s) => s.setCurrentRoom);
  const updateRoomInList = useRoomStore((s) => s.updateRoomInList);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const fetchMembers = useRoomStore((s) => s.fetchMembers);

  const user = useAuthStore((s) => s.user);
  const {
    showMembersList,
    toggleMembersList,
    toggleSidebar,
  } = useUIStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);

  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomError, setRoomError] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);

  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'owner' ||
    members.some((m) => m.user.id === user?.id && m.role === 'admin');

  useEffect(() => {
    setShowSearch(false);
    setShowPinned(false);
    setShowRoomSettings(false);
  }, [currentRoom?.id]);

  const handleTogglePinned = async () => {
    if (!currentRoom) return;
    if (showPinned) {
      setShowPinned(false);
      return;
    }
    setShowPinned(true);
    setLoadingPinned(true);
    try {
      const { data } = await messagesApi.getPinned(currentRoom.id);
      setPinnedMessages(data);
    } catch {
      setPinnedMessages([]);
    } finally {
      setLoadingPinned(false);
    }
  };

  const openRoomSettings = () => {
    if (!currentRoom) return;
    setRoomName(currentRoom.name);
    setRoomDesc(currentRoom.description || '');
    setRoomError('');
    setShowRoomSettings(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom || !roomName.trim()) return;
    setRoomError('');
    setSavingRoom(true);
    try {
      const { data } = await roomsApi.update(currentRoom.id, {
        name: roomName.trim(),
        description: roomDesc.trim(),
      });
      updateRoomInList(data);
      await fetchRooms();
      if (members.length === 0) {
        await fetchMembers(currentRoom.id);
      }
      setShowRoomSettings(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setRoomError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          'Не удалось сохранить настройки канала'
      );
    } finally {
      setSavingRoom(false);
    }
  };

  const handleArchiveRoom = async () => {
    if (!currentRoom) return;
    setRoomError('');
    setSavingRoom(true);
    try {
      await roomsApi.archive(currentRoom.id);
      setCurrentRoom(null);
      await fetchRooms();
      setShowRoomSettings(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setRoomError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          'Не удалось архивировать канал'
      );
    } finally {
      setSavingRoom(false);
    }
  };

  const memberCount =
    members.length > 0
      ? members.length
      : currentRoom?.memberCount ?? currentRoom?._count?.members ?? 0;

  return (
    <>
      <header className="h-14 px-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-shrink-0 relative">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden"
            title="Открыть меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          {currentRoom ? (
            <>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {currentRoom.type === 'private' ? (
                  <Lock className="w-4 h-4 text-gray-500" />
                ) : (
                  <Hash className="w-4 h-4 text-gray-500" />
                )}
                <h2 className="text-base font-semibold text-gray-900 truncate max-w-[180px] sm:max-w-xs">
                  {currentRoom.name}
                </h2>
              </div>

              {currentRoom.description && (
                <>
                  <span className="hidden sm:inline-block h-4 w-px bg-gray-200 flex-shrink-0" />
                  <p className="hidden sm:block text-xs text-gray-500 truncate">
                    {currentRoom.description}
                  </p>
                </>
              )}
            </>
          ) : (
            <h2 className="text-base font-semibold text-gray-900">
              Corp Messenger
            </h2>
          )}
        </div>

        {currentRoom && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {showSearch ? (
              <RoomSearch
                roomId={currentRoom.id}
                onSelectMessage={(msgId) => onScrollToMessage?.(msgId)}
                onClose={() => setShowSearch(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Поиск по каналу"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleTogglePinned}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showPinned
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
              title="Закреплённые сообщения"
            >
              <Pin className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleMembersList}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showMembersList
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
              title="Участники канала"
            >
              <Users className="w-4 h-4" />
              <span>{memberCount}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={openRoomSettings}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Настройки канала"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Pinned messages popover */}
        {showPinned && currentRoom && (
          <div className="absolute right-4 top-14 mt-1 w-80 sm:w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-40">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                <Pin className="w-4 h-4 text-primary-600" />
                <span>Закреплённые сообщения</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPinned(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPinned ? (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                В этом канале нет закреплённых сообщений
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pinnedMessages.map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => {
                      onScrollToMessage?.(msg.id);
                      setShowPinned(false);
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-2.5"
                  >
                    <UserAvatar user={msg.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {msg.user.displayName}
                        </span>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-3 break-words">
                        {msg.content}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Room Settings Modal */}
      {showRoomSettings && currentRoom && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowRoomSettings(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Настройки канала
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomSettings(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveRoom} className="p-6 space-y-4">
              {roomError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {roomError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleArchiveRoom}
                  disabled={savingRoom}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                >
                  Архивировать канал
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRoomSettings(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoom}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
                  >
                    {savingRoom && <Loader2 className="w-4 h-4 animate-spin" />}
                    Сохранить
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
