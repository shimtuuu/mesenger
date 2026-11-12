import React from 'react';
import { X, Crown, Shield } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';
import { useUIStore } from '../../stores/uiStore';
import { UserAvatar } from './UserAvatar';
import type { RoomMember } from '../../types';

export const MemberList: React.FC = () => {
  const members = useRoomStore((s) => s.members);
  const toggleMembersList = useUIStore((s) => s.toggleMembersList);

  const onlineMembers = members.filter((m) => m.user.presence !== 'offline');
  const offlineMembers = members.filter((m) => m.user.presence === 'offline');

  const renderRoleBadge = (member: RoomMember) => {
    const sysRole = member.user.role;
    const roomRole = member.role;
    if (sysRole === 'owner' || sysRole === 'admin' || roomRole === 'admin') {
      return (
        <span
          title="Администратор"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200"
        >
          <Crown className="w-3 h-3" />
        </span>
      );
    }
    if (sysRole === 'moderator' || roomRole === 'moderator') {
      return (
        <span
          title="Модератор"
          className="inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
        >
          <Shield className="w-3 h-3" />
        </span>
      );
    }
    return null;
  };

  const renderMemberItem = (member: RoomMember, isOffline = false) => (
    <button
      key={member.id}
      type="button"
      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-left group"
    >
      <UserAvatar
        user={member.user}
        size="sm"
        showStatus
        className={isOffline ? 'opacity-60' : undefined}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-medium truncate ${
              isOffline ? 'text-gray-500' : 'text-gray-800'
            }`}
          >
            {member.user.displayName}
          </span>
          {renderRoleBadge(member)}
        </div>
        {member.user.statusText && (
          <p className="text-xs text-gray-400 truncate">{member.user.statusText}</p>
        )}
      </div>
    </button>
  );

  return (
    <aside className="w-[260px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Участники</h3>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleMembersList}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Закрыть панель участников"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {onlineMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              В сети — {onlineMembers.length}
            </div>
            <div className="mt-1 space-y-0.5">
              {onlineMembers.map((m) => renderMemberItem(m, false))}
            </div>
          </div>
        )}

        {offlineMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Не в сети — {offlineMembers.length}
            </div>
            <div className="mt-1 space-y-0.5">
              {offlineMembers.map((m) => renderMemberItem(m, true))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            Нет участников
          </div>
        )}
      </div>
    </aside>
  );
};

export default MemberList;
