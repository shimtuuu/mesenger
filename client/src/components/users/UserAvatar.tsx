import React from 'react';
import { cn } from '../../utils/cn';
import { PresenceIndicator, type PresenceStatus } from './PresenceIndicator';
import type { User } from '../../types';

interface UserAvatarProps {
  user?: Partial<Pick<User, 'displayName' | 'username' | 'avatar' | 'presence'>>;
  name?: string;
  avatar?: string;
  presence?: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
  statusRingClassName?: string;
}

const AVATAR_BG_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
];

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  avatar,
  presence,
  size = 'md',
  showStatus = false,
  className,
  statusRingClassName = 'ring-white',
}) => {
  const displayName = user?.displayName || name || user?.username || '?';
  const usernameKey = user?.username || displayName;
  const avatarUrl = user?.avatar ?? avatar;
  const userPresence = user?.presence ?? presence ?? 'offline';
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={cn(
            'rounded-full object-cover select-none',
            SIZE_CLASSES[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center text-white font-semibold select-none',
            SIZE_CLASSES[size],
            getColorFromString(usernameKey)
          )}
        >
          {initial}
        </div>
      )}
      {showStatus && (
        <PresenceIndicator
          presence={userPresence}
          size={size === 'sm' ? 'sm' : 'md'}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 ring-2',
            statusRingClassName
          )}
        />
      )}
    </div>
  );
};

export default UserAvatar;
