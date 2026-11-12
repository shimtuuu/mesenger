import React, { useState } from 'react';
import { X, Hash, Lock, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useRoomStore } from '../../stores/roomStore';
import { useUIStore } from '../../stores/uiStore';
import type { Room } from '../../types';

interface CreateRoomModalProps {
  onRoomCreated?: (room: Room) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  onRoomCreated,
}) => {
  const showCreateRoom = useUIStore((s) => s.showCreateRoom);
  const toggleCreateRoom = useUIStore((s) => s.toggleCreateRoom);
  const createRoom = useRoomStore((s) => s.createRoom);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!showCreateRoom) return null;

  const handleClose = () => {
    setName('');
    setDescription('');
    setType('public');
    setError('');
    toggleCreateRoom();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError('Название канала должно быть от 2 до 50 символов');
      return;
    }

    setSubmitting(true);
    try {
      const room = await createRoom({
        name: trimmedName,
        description: description.trim() || undefined,
        type,
      });
      handleClose();
      onRoomCreated?.(room);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.message ||
          'Не удалось создать канал'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Создать канал</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Название канала
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {type === 'private' ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
              </span>
              <input
                id="room-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="например, разработка"
                autoFocus
                required
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="room-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
              Описание <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <textarea
              id="room-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Для чего предназначен этот канал?"
              rows={3}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Тип канала
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('public')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                  type === 'public'
                    ? 'border-primary-600 bg-primary-50/60 text-primary-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Hash className="w-4 h-4" />
                  Публичный
                </span>
                <span className="text-xs text-gray-500">
                  Виден всем сотрудникам
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('private')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                  type === 'private'
                    ? 'border-primary-600 bg-primary-50/60 text-primary-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Lock className="w-4 h-4" />
                  Приватный
                </span>
                <span className="text-xs text-gray-500">
                  Только для участников
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
