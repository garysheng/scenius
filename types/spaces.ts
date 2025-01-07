import { Timestamp } from 'firebase/firestore';
import { AccessControl } from './index';

export interface SpaceSettings {
  appearance?: {
    compactMode?: boolean;
    reduceMotion?: boolean;
    highContrast?: boolean;
  };
  notifications?: {
    email?: boolean;
    push?: boolean;
    mentions?: 'all' | 'direct' | 'none';
    messages?: 'all' | 'mentions' | 'none';
  };
  access?: {
    isPublic?: boolean;
    domains?: Array<{
      id: string;
      domain: string;
    }>;
    inviteLinks?: Array<{
      id: string;
      code: string;
      uses: number;
      maxUses: number | null;
      expires: string | null;
    }>;
  };
}

export interface Space {
  id: string;
  name: string;
  description?: string;
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
  imageUrl?: string | null;
}

export interface SpaceFrontend extends Omit<Space, 'createdAt' | 'updatedAt'> {
  createdAt: Date;
  updatedAt: Date;
}

export interface SpaceMember {
  userId: string;
  spaceId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
} 