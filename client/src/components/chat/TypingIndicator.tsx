import React from 'react';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';

export const TypingIndicator: React.FC = () => {
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const typingUsersMap = useRoomStore((s) => s.typingUsers);
  const members = useRoomStore((s) => s.members);
  const currentUser = useAuthStore((s) => s.user);

  const rawTyping = currentRoom ? typingUsersMap[currentRoom.id] ?? [] : [];

  const typingNames = rawTyping
    .filter(
      (entry) =>
        entry !== currentUser?.id &&
        entry !== currentUser?.username &&
        entry !== currentUser?.displayName
    )
    .map((entry) => {
      const matched = members.find(
        (m) => m.user.id === entry || m.user.username === entry
      );
      return matched ? matched.user.displayName : entry;
    });

  let label = '';
  if (typingNames.length === 1) {
    label = `${typingNames[0]} печатает`;
  } else if (typingNames.length === 2) {
    label = `${typingNames[0]}, ${typingNames[1]} печатают`;
  } else if (typingNames.length >= 3) {
    label = 'Несколько человек печатают';
  }

  return (
    <div className="h-5 px-5 flex items-center text-xs text-gray-500 bg-white flex-shrink-0 select-none">
      {label && (
        <span className="inline-flex items-center gap-1">
          <span>{label}</span>
          <span className="inline-flex gap-0.5 items-center" aria-hidden="true">
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" />
          </span>
        </span>
      )}
    </div>
  );
};

export default TypingIndicator;
