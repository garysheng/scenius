import { Timestamp } from 'firebase/firestore';
export * from './spaces';

// Auth & User Types
export interface AuthConfig {
  providers: {
    email: boolean;
    google: boolean;
    github?: boolean;
    discord?: boolean;
  };
  redirects: {
    signIn: string;
    signUp: string;
    afterSignIn: string;
    afterSignUp: string;
  };
  session: {
    expiryTime: number; // in seconds
    refreshThreshold: number; // in seconds
  };
}

// Backend Types (Firestore)
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  status: 'online' | 'offline' | 'away';
  lastSeen: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  preferences: {
    notifications: boolean;
    theme: 'dark' | 'light';
    language: string;
  };
  walletAddresses?: string[];
}

export interface Channel {
  id: string;
  spaceId: string;
  name: string;
  description: string;
  kind: 'CHANNEL' | 'DM';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    messageCount: number;
    lastMessageAt: Timestamp | null;
    lastMessageSenderId?: string;
    participantIds?: string[];
  };
  permissions: {
    roleId: string;
    actions: string[];
  }[];
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: 'TEXT' | 'VOICE';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deleted?: boolean;
  threadId: string | null; // Parent message ID if this is a thread reply
  metadata: {
    reactions: Record<string, string[]>;
    edited: boolean;
    attachments: FileAttachment[];
    threadInfo?: {
      replyCount: number;
      lastReplyAt: Timestamp | null;
      participantIds: string[];
    };
  };
}

export interface AccessControl {
  type: 'TOKEN_GATE' | 'DOMAIN' | 'EMAIL' | 'CUSTOM' | 'GUILD';
  config: {
    domains?: string[];
    emails?: string[];
    guildId?: string;
    customLogic?: string;
    requirements?: GuildRequirement[];
  };
  combineMethod: 'AND' | 'OR';
}

export interface GuildRequirement {
  type: 'TOKEN' | 'NFT' | 'POAP' | 'CUSTOM';
  chain: string;
  address: string;
  amount?: string;
  tokenId?: string;
  customLogic?: string;
}

// Frontend Types
export interface UserFrontend extends Omit<User, 'lastSeen' | 'createdAt' | 'updatedAt'> {
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelFrontend extends Omit<Channel, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    messageCount: number;
    lastMessageAt: Date | null;
    lastMessageSenderId?: string;
    participantIds?: string[];
    participants?: UserFrontend[];
  };
}

export interface MessageFrontend extends Omit<Message, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    reactions: Record<string, string[]>;
    edited: boolean;
    attachments: FileAttachment[];
    threadInfo?: {
      replyCount: number;
      lastReplyAt: Date | null;
      participantIds: string[];
    };
  };
}

export type UserPresence = {
  status: 'online' | 'offline' | 'away' | 'dnd'; // dnd = do not disturb
  lastSeen?: Date;
  customStatus?: string;
  updatedAt: Date;
};

export type UserPresenceFrontend = Omit<UserPresence, 'updatedAt'> & {
  updatedAt: Date;
};

export interface FileAttachment {
  id: string;
  fileUrl?: string;
  voiceUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl?: string;
  uploadStatus: 'uploading' | 'complete' | 'error';
  uploadProgress: number;
}