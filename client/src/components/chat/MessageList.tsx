import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageSquare, ArrowDown } from 'lucide-react';
import { useMessageStore } from '../../stores/messageStore';
import { useRoomStore } from '../../stores/roomStore';
import { useAuthStore } from '../../stores/authStore';
import { formatDateDivider } from '../../utils/format';
import { MessageItem } from './MessageItem';
import type { Message } from '../../types';

interface MessageListProps {
  highlightedMessageId?: string | null;
}

function encodeFallbackCursor(msg: Message): string {
  const payload = JSON.stringify({
    id: msg.id,
    createdAt: new Date(msg.createdAt).toISOString(),
  });
  return btoa(payload);
}

export const MessageList: React.FC<MessageListProps> = ({
  highlightedMessageId,
}) => {
  const { messages, nextCursor, hasMore, isLoading, fetchMessages } =
    useMessageStore();
  const currentRoom = useRoomStore((s) => s.currentRoom);
  const currentUser = useAuthStore((s) => s.user);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const lastRoomIdRef = useRef<string | null>(null);
  const lastNewestIdRef = useRef<string | null>(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Store holds messages newest-first; reverse for chronological top-to-bottom display
  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior });
    }
  };

  // Initial room switch -> scroll to bottom when messages arrive
  useEffect(() => {
    if (!currentRoom) return;
    if (lastRoomIdRef.current !== currentRoom.id) {
      lastRoomIdRef.current = currentRoom.id;
      isAtBottomRef.current = true;
      setShowScrollBottom(false);
      lastNewestIdRef.current = null;
    }
  }, [currentRoom]);

  // Auto-scroll to bottom on new messages (if already at bottom, own message, or room first load)
  useEffect(() => {
    if (orderedMessages.length === 0) return;
    const newest = orderedMessages[orderedMessages.length - 1];
    const isInitialLoad = lastNewestIdRef.current === null;
    const hasNewNewest = newest.id !== lastNewestIdRef.current;

    if (hasNewNewest) {
      lastNewestIdRef.current = newest.id;
      if (
        isInitialLoad ||
        isAtBottomRef.current ||
        newest.userId === currentUser?.id
      ) {
        requestAnimationFrame(() => {
          scrollToBottom(isInitialLoad ? 'auto' : 'smooth');
        });
      }
    }
  }, [orderedMessages, currentUser?.id]);

  // Scroll to highlighted message (e.g. from search or pinned)
  useEffect(() => {
    if (!highlightedMessageId) return;
    const el = document.getElementById(`message-${highlightedMessageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedMessageId]);

  const handleScroll = async () => {
    const container = containerRef.current;
    if (!container || !currentRoom) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const atBottom = distanceFromBottom < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollBottom(!atBottom && orderedMessages.length > 0);

    // Infinite scroll UP for older messages
    if (
      container.scrollTop < 60 &&
      hasMore &&
      !isLoading &&
      !loadingMoreRef.current &&
      orderedMessages.length > 0
    ) {
      loadingMoreRef.current = true;
      const prevScrollHeight = container.scrollHeight;
      const prevScrollTop = container.scrollTop;
      const oldest = orderedMessages[0];
      const cursor = nextCursor || encodeFallbackCursor(oldest);

      try {
        await fetchMessages(currentRoom.id, cursor);
        requestAnimationFrame(() => {
          if (containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop =
              newScrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      } catch {
        // ignore fetch errors on scroll
      } finally {
        loadingMoreRef.current = false;
      }
    }
  };

  if (isLoading && orderedMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white gap-2">
        <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
        <p className="text-sm text-gray-500">Загрузка...</p>
      </div>
    );
  }

  if (!isLoading && orderedMessages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-3">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-base font-medium text-gray-800">
          Нет сообщений. Начните общение!
        </p>
        {currentRoom && (
          <p className="text-sm text-gray-500 mt-1">
            Это начало истории канала #{currentRoom.name}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 bg-white">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto py-4"
      >
        {/* Top loading spinner for pagination */}
        {isLoading && orderedMessages.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
            <span>Загрузка...</span>
          </div>
        )}

        {orderedMessages.map((msg, index) => {
          const prev = index > 0 ? orderedMessages[index - 1] : null;
          const msgDateStr = new Date(msg.createdAt).toDateString();
          const prevDateStr = prev
            ? new Date(prev.createdAt).toDateString()
            : null;
          const showDateDivider = msgDateStr !== prevDateStr;

          const isCompact =
            !!prev &&
            !showDateDivider &&
            prev.userId === msg.userId &&
            !msg.replyTo &&
            !prev.isDeleted &&
            !msg.isDeleted &&
            new Date(msg.createdAt).getTime() -
              new Date(prev.createdAt).getTime() <
              5 * 60 * 1000;

          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className="flex items-center gap-4 px-5 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 select-none">
                    {formatDateDivider(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <MessageItem
                message={msg}
                isCompact={isCompact}
                isHighlighted={highlightedMessageId === msg.id}
              />
            </React.Fragment>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-4 right-6 p-2.5 rounded-full bg-white border border-gray-200 shadow-lg text-gray-600 hover:text-primary-600 hover:border-primary-300 transition-colors"
          title="К последним сообщениям"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default MessageList;
