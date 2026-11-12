import React from 'react';
import { cn } from '../../utils/cn';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';

interface PresenceIndicatorProps {
  presence: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-400',
};

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  presence,
  size = 'md',
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-block rounded-full flex-shrink-0',
        PRESENCE_COLORS[presence] ?? PRESENCE_COLORS.offline,
        SIZE_CLASSES[size],
        className
      )}
      aria-label={presence}
    />
  );
};

export default PresenceIndicator;
