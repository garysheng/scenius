import { Timestamp } from 'firebase/firestore';

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

export interface Space {
  id: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerId: string;
  accessControl: AccessControl;
  settings: {
    isPublic: boolean;
    allowGuests: boolean;
    defaultRoleId: string;
  };
  metadata: {
    memberCount: number;
    channelCount: number;
  };
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
  metadata: {
    reactions: Record<string, string[]>;
    edited: boolean;
    attachments: {
      voiceUrl?: string;
      transcription?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    }[];
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

export interface SpaceFrontend extends Omit<Space, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelFrontend extends Omit<Channel, 'createdAt' | 'updatedAt' | 'metadata'> {
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    messageCount: number;
    lastMessageAt: Date | null;
    participantIds?: string[];
    participants?: UserFrontend[];
  };
}

export interface MessageFrontend extends Omit<Message, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
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

export type SpaceMember = {
  userId: string;
  spaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}; 