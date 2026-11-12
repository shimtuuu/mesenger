import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { messages as messagesApi } from '../../services/api';
import { formatMessageTime } from '../../utils/format';
import { UserAvatar } from '../users/UserAvatar';
import type { Message } from '../../types';

interface RoomSearchProps {
  roomId: string;
  onSelectMessage: (messageId: string) => void;
  onClose?: () => void;
}

export const RoomSearch: React.FC<RoomSearchProps> = ({
  roomId,
  onSelectMessage,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery('');
    setResults([]);
    setOpen(false);
  }, [roomId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await messagesApi.search(roomId, trimmed);
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, roomId]);

  const highlightText = (text: string, q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      part.toLowerCase() === trimmed.toLowerCase() ? (
        <mark key={idx} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-56 sm:w-64">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || query.trim()) setOpen(true);
          }}
          placeholder="Поиск сообщений..."
          autoFocus
          className="w-full pl-8 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        />
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-2.5" />
        ) : (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
              onClose?.();
            }}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            title="Закрыть поиск"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 z-40">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-medium text-gray-500 flex items-center justify-between">
            <span>Результаты поиска</span>
            <span>{results.length}</span>
          </div>

          {results.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {loading ? 'Поиск...' : 'Совпадений не найдено'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    onSelectMessage(msg.id);
                    setOpen(false);
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
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 break-words">
                      {highlightText(msg.content, query)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomSearch;
