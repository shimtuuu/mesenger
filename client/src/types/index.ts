export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  statusText: string;
  presence: 'online' | 'away' | 'dnd' | 'offline';
  role: 'owner' | 'admin' | 'moderator' | 'member' | 'guest';
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  type: 'public' | 'private' | 'dm';
  isArchived: boolean;
  createdById?: string;
  createdAt: string;
  memberCount?: number;
  unreadCount?: number;
  _count?: {
    members: number;
  };
}

export type RoomMemberUser = Pick<
  User,
  'id' | 'username' | 'displayName' | 'avatar' | 'presence' | 'statusText'
> &
  Partial<Pick<User, 'email' | 'role' | 'isActive' | 'lastSeenAt' | 'createdAt'>>;

export interface RoomMember {
  id: string;
  role: 'admin' | 'moderator' | 'member';
  lastReadAt: string;
  joinedAt: string;
  user: RoomMemberUser;
}

export interface Message {
  id: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  roomId: string;
  replyToId?: string;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatar'>;
  replyTo?: {
    id: string;
    content: string;
    user: Pick<User, 'id' | 'username' | 'displayName'>;
  } | null;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | string;
  ipAddress: string | null;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'displayName'>;
}
