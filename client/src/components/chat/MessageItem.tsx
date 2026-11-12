import React, { useState, useRef, useEffect } from 'react';
import { Reply, Edit3, Trash2, Pin, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatMessageTime } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import { useMessageStore } from '../../stores/messageStore';
import { useRoomStore } from '../../stores/roomStore';
import { UserAvatar } from '../users/UserAvatar';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isCompact?: boolean;
  isHighlighted?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isCompact = false,
  isHighlighted = false,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const members = useRoomStore((s) => s.members);
  const { setReplyTo, editMessage, deleteMessage, togglePin } = useMessageStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      const len = editInputRef.current.value.length;
      editInputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const isOwn = currentUser?.id === message.userId;
  const currentMember = members.find((m) => m.user.id === currentUser?.id);
  const canDelete =
    isOwn ||
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'moderator' ||
    currentMember?.role === 'admin' ||
    currentMember?.role === 'moderator';

  const extractError = (err: unknown, fallback: string) => {
    const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
    return axiosErr.response?.data?.error || axiosErr.response?.data?.message || fallback;
  };

  const handleStartEdit = () => {
    setEditContent(message.content);
    setActionError('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setActionError('');
    setEditContent(message.content);
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      handleCancelEdit();
      return;
    }
    setSavingEdit(true);
    setActionError('');
    try {
      await editMessage(message.id, trimmed);
      setIsEditing(false);
    } catch (err) {
      setActionError(extractError(err, 'Не удалось сохранить изменения'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTogglePin = async () => {
    setActionError('');
    try {
      await togglePin(message.id);
    } catch (err) {
      setActionError(extractError(err, 'Не удалось изменить закрепление'));
    }
  };

  const handleDelete = async () => {
    setActionError('');
    try {
      await deleteMessage(message.id);
    } catch (err) {
      setActionError(extractError(err, 'Не удалось удалить сообщение'));
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const formattedTime = formatMessageTime(message.createdAt);
  const shortTime = new Date(message.createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group relative px-5 hover:bg-chat-hover transition-colors duration-150 flex gap-3',
        isCompact ? 'py-0.5' : 'pt-2 pb-1 mt-1',
        isHighlighted && 'bg-amber-50/90 hover:bg-amber-50'
      )}
    >
      {/* Left column: Avatar or hover timestamp for compact */}
      {isCompact ? (
        <div className="w-10 flex-shrink-0 flex items-start justify-end pt-0.5">
          <span className="opacity-0 group-hover:opacity-100 text-[11px] text-gray-400 select-none transition-opacity">
            {shortTime}
          </span>
        </div>
      ) : (
        <div className="flex-shrink-0 pt-0.5">
          <UserAvatar user={message.user} size="md" />
        </div>
      )}

      {/* Right column: Header + Reply + Content */}
      <div className="min-w-0 flex-1">
        {!isCompact && (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-primary-600">
              {message.user.displayName}
            </span>
            <span className="text-xs text-gray-400">{formattedTime}</span>
            {message.isEdited && !message.isDeleted && (
              <span className="text-xs text-gray-400">(ред.)</span>
            )}
            {message.isPinned && !message.isDeleted && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600 font-medium">
                <Pin className="w-3 h-3" />
                Закреплено
              </span>
            )}
          </div>
        )}

        {/* Quoted reply block */}
        {!message.isDeleted && message.replyTo && (
          <div className="mt-1 mb-1 pl-2.5 pr-2 py-1 border-l-2 border-gray-300 bg-gray-50/80 rounded-r text-xs text-gray-600 max-w-xl flex items-baseline gap-1 min-w-0">
            <span className="font-semibold text-gray-700 flex-shrink-0">
              {message.replyTo.user.displayName}:
            </span>
            <span className="truncate">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message body */}
        {message.isDeleted ? (
          <p className="text-sm italic text-gray-400 py-0.5">
            Сообщение удалено
          </p>
        ) : isEditing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={2}
              disabled={savingEdit}
              className="w-full px-3 py-2 text-sm rounded-lg border border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-white"
            />
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Сохранить
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Отмена
              </button>
              <span className="text-gray-400 hidden sm:inline">
                Enter — сохранить, Esc — отмена
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5 min-w-0">
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed min-w-0">
              {message.content}
            </p>
            {isCompact && message.isEdited && (
              <span className="text-[11px] text-gray-400 flex-shrink-0">
                (ред.)
              </span>
            )}
            {isCompact && message.isPinned && (
              <Pin className="w-3 h-3 text-amber-600 flex-shrink-0 self-center" />
            )}
          </div>
        )}

        {actionError && (
          <p className="mt-1 text-xs text-red-600">{actionError}</p>
        )}
      </div>

      {/* Hover action toolbar */}
      {!message.isDeleted && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 absolute right-5 -top-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center p-0.5 z-10">
          <button
            type="button"
            onClick={() => setReplyTo(message)}
            className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="Ответить"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleTogglePin}
            className={cn(
              'p-1.5 rounded transition-colors',
              message.isPinned
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            )}
            title={message.isPinned ? 'Открепить' : 'Закрепить'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {isOwn && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="p-1.5 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="Редактировать"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
