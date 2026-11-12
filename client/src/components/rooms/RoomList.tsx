import React from 'react';
import { Hash, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRoomStore } from '../../stores/roomStore';
import { useUIStore } from '../../stores/uiStore';
import type { Room } from '../../types';

interface RoomListProps {
  searchQuery?: string;
  onSelectRoom: (room: Room) => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  searchQuery = '',
  onSelectRoom,
}) => {
  const rooms = useRoomStore((s) => s.rooms);
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const showAdminPanel = useUIStore((s) => s.showAdminPanel);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRooms = rooms.filter((room) => {
    if (room.isArchived || room.type === 'dm') return false;
    if (!normalizedQuery) return true;
    return (
      room.name.toLowerCase().includes(normalizedQuery) ||
      room.description?.toLowerCase().includes(normalizedQuery)
    );
  });

  if (filteredRooms.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-sidebar-muted">
        {normalizedQuery ? 'Каналы не найдены' : 'Нет доступных каналов'}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {filteredRooms.map((room) => {
        const isActive = !showAdminPanel && currentRoom?.id === room.id;
        const unread = room.unreadCount ?? 0;

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onSelectRoom(room)}
            className={cn(
              'w-full px-3 py-1.5 rounded-md flex items-center justify-between gap-2 text-sm transition-colors duration-150 text-left',
              isActive
                ? 'bg-sidebar-active text-white font-medium'
                : 'text-sidebar-text/80 hover:bg-sidebar-hover hover:text-sidebar-text'
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              {room.type === 'private' ? (
                <Lock className="w-4 h-4 flex-shrink-0 text-sidebar-muted" />
              ) : (
                <Hash className="w-4 h-4 flex-shrink-0 text-sidebar-muted" />
              )}
              <span className="truncate">{room.name}</span>
            </span>

            {unread > 0 && (
              <span className="flex-shrink-0 bg-primary-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default RoomList;
