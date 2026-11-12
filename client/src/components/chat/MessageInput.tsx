import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Reply } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRoomStore } from '../../stores/roomStore';
import { useMessageStore } from '../../stores/messageStore';

const MAX_MESSAGE_LENGTH = 5000;

interface MessageInputProps {
  onSendMessage: (roomId: string, content: string, replyToId?: string) => Promise<boolean>;
  onTyping: (roomId: string) => void;
  onStopTyping: (roomId: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  onStopTyping,
}) => {
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const { replyTo, setReplyTo, sendMessage: sendViaRest } = useMessageStore();

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setError('');
    textareaRef.current?.focus();
  }, [currentRoom?.id, replyTo]);

  if (!currentRoom) return null;

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    if (error && value.trim().length <= MAX_MESSAGE_LENGTH) {
      setError('');
    }
    adjustHeight();
    if (value.trim()) {
      onTyping(currentRoom.id);
    } else {
      onStopTyping(currentRoom.id);
    }
  };

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Сообщение не должно превышать ${MAX_MESSAGE_LENGTH} символов`);
      return;
    }

    const targetRoomId = currentRoom.id;
    const replyId = replyTo?.id;

    setError('');
    setSending(true);
    onStopTyping(targetRoomId);

    try {
      const sentViaSocket = await onSendMessage(targetRoomId, trimmed, replyId);
      if (!sentViaSocket) {
        await sendViaRest(targetRoomId, trimmed, replyId);
      }
      setContent('');
      setReplyTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      textareaRef.current?.focus();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      setError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          axiosErr.message ||
          'Не удалось отправить сообщение'
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const trimmedLength = content.trim().length;
  const isOverLimit = trimmedLength > MAX_MESSAGE_LENGTH;
  const canSend = trimmedLength > 0 && !isOverLimit && !sending;

  return (
    <div className="px-5 pt-2 bg-white flex-shrink-0">
      {error && (
        <div className="mb-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {replyTo && (
        <div className="mb-1.5 px-3 py-2 rounded-t-lg bg-gray-50 border border-b-0 border-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <div className="min-w-0 text-xs flex items-baseline gap-1">
              <span className="font-semibold text-gray-800 flex-shrink-0">
                Ответ для {replyTo.user.displayName}:
              </span>
              <span className="text-gray-500 truncate">
                {replyTo.content}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200/70 transition-colors flex-shrink-0"
            title="Отменить ответ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-2 border bg-white px-3 py-2 focus-within:ring-2 transition-colors',
          isOverLimit
            ? 'border-red-400 focus-within:ring-red-500 focus-within:border-red-500'
            : 'border-gray-300 focus-within:ring-primary-500 focus-within:border-primary-500',
          replyTo ? 'rounded-b-lg' : 'rounded-lg'
        )}
      >
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
          placeholder={`Написать сообщение в #${currentRoom.name}...`}
          className="flex-1 max-h-[200px] text-sm text-gray-900 placeholder-gray-400 bg-transparent border-0 focus:outline-none resize-none py-1 leading-relaxed disabled:opacity-60"
        />

        {content.length > 4500 && (
          <span
            className={cn(
              'text-[11px] self-center flex-shrink-0',
              isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'
            )}
          >
            {trimmedLength}/{MAX_MESSAGE_LENGTH}
          </span>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'p-2 rounded-lg flex-shrink-0 transition-colors duration-150',
            canSend
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          title="Отправить сообщение"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
