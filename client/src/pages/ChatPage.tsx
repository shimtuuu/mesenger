import React, { useEffect, useCallback, useState, useRef } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../stores/roomStore';
import { useMessageStore } from '../stores/messageStore';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MemberList } from '../components/users/MemberList';
import { CreateRoomModal } from '../components/rooms/CreateRoomModal';
import { AdminPanel } from '../components/admin/AdminPanel';
import type { Room } from '../types';

export const ChatPage: React.FC = () => {
  const {
    sendMessage,
    stopTyping,
    joinRoom: socketJoinRoom,
    leaveRoom: socketLeaveRoom,
    updatePresence,
    handleTyping,
  } = useSocket();

  const {
    rooms,
    currentRoom,
    fetchRooms,
    setCurrentRoom,
    joinRoom: restJoinRoom,
    fetchMembers,
    updateUnreadCount,
  } = useRoomStore();

  const { fetchMessages, clearMessages } = useMessageStore();
  const {
    sidebarOpen,
    toggleSidebar,
    showMembersList,
    showAdminPanel,
    toggleCreateRoom,
  } = useUIStore();
  const user = useAuthStore((s) => s.user);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRoomRef = useRef(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSelectRoom = useCallback(
    async (room: Room) => {
      const prevRoom = useRoomStore.getState().currentRoom;
      if (prevRoom && prevRoom.id !== room.id) {
        socketLeaveRoom(prevRoom.id);
      }

      setCurrentRoom(room);
      updateUnreadCount(room.id, 0);
      clearMessages();

      if (sidebarOpen && window.innerWidth < 768) {
        toggleSidebar();
      }

      try {
        await fetchMessages(room.id);
      } catch (err: unknown) {
        if (useRoomStore.getState().currentRoom?.id !== room.id) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403 && room.type === 'public') {
          try {
            await restJoinRoom(room.id);
            if (useRoomStore.getState().currentRoom?.id !== room.id) return;
            await fetchMessages(room.id);
          } catch {
            // ignore join failure
          }
        }
      }

      if (useRoomStore.getState().currentRoom?.id !== room.id) return;

      try {
        await fetchMembers(room.id);
      } catch {
        // ignore member fetch failure
      }

      if (useRoomStore.getState().currentRoom?.id !== room.id) return;

      socketJoinRoom(room.id);
    },
    [
      setCurrentRoom,
      updateUnreadCount,
      clearMessages,
      sidebarOpen,
      toggleSidebar,
      fetchMessages,
      restJoinRoom,
      fetchMembers,
      socketJoinRoom,
      socketLeaveRoom,
    ]
  );

  // Auto-select #general (or first available room) after initial rooms fetch
  useEffect(() => {
    if (!initializedRoomRef.current && rooms.length > 0 && !currentRoom) {
      initializedRoomRef.current = true;
      const defaultRoom =
        rooms.find((r) => r.name.toLowerCase() === 'general') || rooms[0];
      if (defaultRoom) {
        handleSelectRoom(defaultRoom);
      }
    }
  }, [rooms, currentRoom, handleSelectRoom]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      {/* Left Sidebar (280px) */}
      <Sidebar
        onSelectRoom={handleSelectRoom}
        onPresenceChange={updatePresence}
      />

      {/* Center Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full">
        {showAdminPanel && isAdmin ? (
          <AdminPanel />
        ) : currentRoom ? (
          <>
            <Header onScrollToMessage={handleScrollToMessage} />
            <MessageList highlightedMessageId={highlightedMessageId} />
            <MessageInput
              onSendMessage={sendMessage}
              onTyping={handleTyping}
              onStopTyping={stopTyping}
            />
            <TypingIndicator />
          </>
        ) : (
          <>
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Выберите канал для общения
              </h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Выберите канал в боковой панели или создайте новый, чтобы начать
                переписку с коллегами.
              </p>
              <button
                type="button"
                onClick={toggleCreateRoom}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Создать канал
              </button>
            </div>
          </>
        )}
      </main>

      {/* Right Members Panel (260px) */}
      {!showAdminPanel && showMembersList && currentRoom && <MemberList />}

      {/* Modals */}
      <CreateRoomModal onRoomCreated={handleSelectRoom} />
    </div>
  );
};

export default ChatPage;
